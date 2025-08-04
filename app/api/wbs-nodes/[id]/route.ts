import { NextRequest, NextResponse } from 'next/server';
import { db, wbsNodes, connectDb } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const { id } = await params;
    const nodeId = parseInt(id);
    const body = await request.json();
    const { name, parentId, order } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const updates: {
      name: string;
      parentId?: number | null;
      order?: number;
      updatedAt: Date;
    } = { name, updatedAt: new Date() };
    if (parentId !== undefined) updates.parentId = parentId ? parseInt(parentId) : null;
    if (order !== undefined) updates.order = order;

    const [updatedNode] = await db
      .update(wbsNodes)
      .set(updates)
      .where(eq(wbsNodes.id, nodeId))
      .returning();

    if (!updatedNode) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: updatedNode.id.toString(),
      name: updatedNode.name,
      parentId: updatedNode.parentId?.toString()
    });
  } catch (error) {
    console.error('Error updating WBS node:', error);
    return NextResponse.json({ error: 'Failed to update WBS node' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const { id } = await params;
    const nodeId = parseInt(id);

    // First delete all child nodes recursively
    const deleteNodeAndChildren = async (id: number) => {
      // Get all children
      const children = await db.select().from(wbsNodes).where(eq(wbsNodes.parentId, id));
      
      // Recursively delete children
      for (const child of children) {
        await deleteNodeAndChildren(child.id);
      }
      
      // Delete the node itself
      await db.delete(wbsNodes).where(eq(wbsNodes.id, id));
    };

    await deleteNodeAndChildren(nodeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting WBS node:', error);
    return NextResponse.json({ error: 'Failed to delete WBS node' }, { status: 500 });
  }
}