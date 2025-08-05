import { NextRequest, NextResponse } from 'next/server';
import { db, wbsNodes, NewWbsNode, connectDb } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';

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
      .orderBy(wbsNodes.parentId, wbsNodes.order);


    // Build tree structure
    const nodeMap = new Map();
    const rootNodes: WBSNodeTree[] = [];

    // First pass: create node map with order information
    nodes.forEach(node => {
      nodeMap.set(node.id, {
        id: node.id.toString(),
        name: node.name,
        parentId: node.parentId?.toString(),
        children: [],
        order: node.order // Keep order for sorting
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

    // Third pass: sort children by order
    const sortChildren = (node: any) => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a: any, b: any) => a.order - b.order);
        node.children.forEach(sortChildren);
      }
      // Remove order property before returning
      delete node.order;
    };

    rootNodes.forEach(sortChildren);
    // Sort root nodes by order
    rootNodes.sort((a: any, b: any) => a.order - b.order);

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
    const { projectId, parentId, name, order } = body;


    if (!projectId || !name) {
      return NextResponse.json({ error: 'Project ID and name are required' }, { status: 400 });
    }

    // Calculate the correct order by querying existing siblings
    let finalOrder = 0;
    const parsedParentId = parentId ? parseInt(parentId) : null;
    
    if (parsedParentId) {
      // Get existing children of this parent
      const siblings = await db.select().from(wbsNodes)
        .where(and(
          eq(wbsNodes.projectId, parseInt(projectId)),
          eq(wbsNodes.parentId, parsedParentId)
        ))
        .orderBy(wbsNodes.order);
      
      // Find the maximum order value and add 1 to place at the end
      const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.order)) : -1;
      finalOrder = maxOrder + 1;
      
    } else {
      // Get existing root nodes
      const rootNodes = await db.select().from(wbsNodes)
        .where(and(
          eq(wbsNodes.projectId, parseInt(projectId)),
          sql`${wbsNodes.parentId} IS NULL`
        ))
        .orderBy(wbsNodes.order);
      
      // Find the maximum order value and add 1 to place at the end
      const maxOrder = rootNodes.length > 0 ? Math.max(...rootNodes.map(r => r.order)) : -1;
      finalOrder = maxOrder + 1;
      
    }

    const newNode: NewWbsNode = {
      projectId: parseInt(projectId),
      parentId: parsedParentId,
      name,
      order: finalOrder
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