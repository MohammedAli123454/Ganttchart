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

    // Start transaction
    await db.transaction(async (tx) => {
      // First, adjust the order of existing nodes at the target location
      if (parsedTargetParentId) {
        // Moving to a parent node - update order of siblings
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
        // Moving to root level - update order of root nodes
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