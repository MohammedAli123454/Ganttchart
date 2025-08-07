import { NextRequest, NextResponse } from 'next/server';
import { db, wbsNodes, connectDb } from '@/lib/db';
import { eq, and, gte, sql } from 'drizzle-orm';

export async function PUT(request: NextRequest) {
  try {
    await connectDb();
    const body = await request.json();
    const { nodeId, targetParentId, targetIndex } = body;

    if (!nodeId || targetIndex === undefined) {
      return NextResponse.json({ error: 'Node ID and target index are required' }, { status: 400 });
    }

    const parsedNodeId = parseInt(nodeId);
    const parsedTargetParentId = targetParentId ? parseInt(targetParentId) : null;

    // Get the node being moved
    const [nodeToMove] = await db.select().from(wbsNodes).where(eq(wbsNodes.id, parsedNodeId));
    
    if (!nodeToMove) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    console.log('Move operation:', {
      nodeId: parsedNodeId,
      currentParent: nodeToMove.parentId,
      currentOrder: nodeToMove.order,
      targetParent: parsedTargetParentId,
      targetIndex
    });

    // Check if the move is actually needed
    if (nodeToMove.parentId === parsedTargetParentId && nodeToMove.order === targetIndex) {
      console.log('Node is already in target position, skipping move');
      return NextResponse.json({ success: true, message: 'Node already in position' });
    }

    // Start transaction
    await db.transaction(async (tx) => {
      const currentParentId = nodeToMove.parentId;
      const currentOrder = nodeToMove.order;
      const isSameParent = currentParentId === parsedTargetParentId;
      
      if (!isSameParent) {
        // Moving to different parent - adjust old parent's children orders first
        if (currentParentId) {
          await tx
            .update(wbsNodes)
            .set({ 
              order: sql`${wbsNodes.order} - 1`,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(wbsNodes.parentId, currentParentId),
                gte(wbsNodes.order, currentOrder)
              )
            );
        } else {
          await tx
            .update(wbsNodes)
            .set({ 
              order: sql`${wbsNodes.order} - 1`,
              updatedAt: new Date()
            })
            .where(
              and(
                sql`${wbsNodes.parentId} IS NULL`,
                gte(wbsNodes.order, currentOrder)
              )
            );
        }
        
        // Make space in new parent
        if (parsedTargetParentId) {
          await tx
            .update(wbsNodes)
            .set({ 
              order: sql`${wbsNodes.order} + 1`,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(wbsNodes.parentId, parsedTargetParentId),
                gte(wbsNodes.order, targetIndex)
              )
            );
        } else {
          await tx
            .update(wbsNodes)
            .set({ 
              order: sql`${wbsNodes.order} + 1`,
              updatedAt: new Date()
            })
            .where(
              and(
                sql`${wbsNodes.parentId} IS NULL`,
                gte(wbsNodes.order, targetIndex)
              )
            );
        }
      } else {
        // Same parent - reorder within same parent
        if (currentOrder < targetIndex) {
          // Moving down - decrease order of items between current and target
          if (parsedTargetParentId) {
            await tx
              .update(wbsNodes)
              .set({ 
                order: sql`${wbsNodes.order} - 1`,
                updatedAt: new Date()
              })
              .where(
                and(
                  eq(wbsNodes.parentId, parsedTargetParentId),
                  sql`${wbsNodes.order} > ${currentOrder}`,
                  sql`${wbsNodes.order} <= ${targetIndex}`
                )
              );
          } else {
            await tx
              .update(wbsNodes)
              .set({ 
                order: sql`${wbsNodes.order} - 1`,
                updatedAt: new Date()
              })
              .where(
                and(
                  sql`${wbsNodes.parentId} IS NULL`,
                  sql`${wbsNodes.order} > ${currentOrder}`,
                  sql`${wbsNodes.order} <= ${targetIndex}`
                )
              );
          }
        } else if (currentOrder > targetIndex) {
          // Moving up - increase order of items between target and current
          if (parsedTargetParentId) {
            await tx
              .update(wbsNodes)
              .set({ 
                order: sql`${wbsNodes.order} + 1`,
                updatedAt: new Date()
              })
              .where(
                and(
                  eq(wbsNodes.parentId, parsedTargetParentId),
                  sql`${wbsNodes.order} >= ${targetIndex}`,
                  sql`${wbsNodes.order} < ${currentOrder}`
                )
              );
          } else {
            await tx
              .update(wbsNodes)
              .set({ 
                order: sql`${wbsNodes.order} + 1`,
                updatedAt: new Date()
              })
              .where(
                and(
                  sql`${wbsNodes.parentId} IS NULL`,
                  sql`${wbsNodes.order} >= ${targetIndex}`,
                  sql`${wbsNodes.order} < ${currentOrder}`
                )
              );
          }
        }
      }

      // Move the node to its new position
      await tx
        .update(wbsNodes)
        .set({
          parentId: parsedTargetParentId,
          order: targetIndex,
          updatedAt: new Date()
        })
        .where(eq(wbsNodes.id, parsedNodeId));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error moving WBS node:', error);
    return NextResponse.json({ error: 'Failed to move WBS node' }, { status: 500 });
  }
}