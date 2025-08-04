import { NextRequest, NextResponse } from 'next/server';
import { db, wbsNodes, NewWbsNode, connectDb } from '@/lib/db';
import { eq } from 'drizzle-orm';

interface WBSNodeTree {
  id: string;
  name: string;
  parentId?: string;
  children: WBSNodeTree[];
}

export async function GET(request: NextRequest) {
  try {
    await connectDb();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const nodes = await db.select().from(wbsNodes)
      .where(eq(wbsNodes.projectId, parseInt(projectId)))
      .orderBy(wbsNodes.order);

    // Build tree structure
    const nodeMap = new Map();
    const rootNodes: WBSNodeTree[] = [];

    // First pass: create node map
    nodes.forEach(node => {
      nodeMap.set(node.id, {
        id: node.id.toString(),
        name: node.name,
        parentId: node.parentId?.toString(),
        children: []
      });
    });

    // Second pass: build tree structure
    nodes.forEach(node => {
      const currentNode = nodeMap.get(node.id);
      if (node.parentId) {
        const parentNode = nodeMap.get(node.parentId);
        if (parentNode) {
          parentNode.children.push(currentNode);
        }
      } else {
        rootNodes.push(currentNode);
      }
    });

    return NextResponse.json(rootNodes);
  } catch (error) {
    console.error('Error fetching WBS nodes:', error);
    return NextResponse.json({ error: 'Failed to fetch WBS nodes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const body = await request.json();
    const { projectId, parentId, name, order = 0 } = body;

    if (!projectId || !name) {
      return NextResponse.json({ error: 'Project ID and name are required' }, { status: 400 });
    }

    const newNode: NewWbsNode = {
      projectId: parseInt(projectId),
      parentId: parentId ? parseInt(parentId) : null,
      name,
      order
    };

    const [createdNode] = await db.insert(wbsNodes).values(newNode).returning();

    return NextResponse.json({
      id: createdNode.id.toString(),
      name: createdNode.name,
      parentId: createdNode.parentId?.toString(),
      children: []
    });
  } catch (error) {
    console.error('Error creating WBS node:', error);
    return NextResponse.json({ error: 'Failed to create WBS node' }, { status: 500 });
  }
}