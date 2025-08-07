import { NextRequest, NextResponse } from 'next/server';
import { db, wbsNodes, projects, connectDb } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

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

    // First check if project root node exists, if not create it
    await ensureProjectRootNode(parseInt(projectId));

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
    const sortChildren = (node: WBSNodeTree & { order?: number }) => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a: WBSNodeTree & { order?: number }, b: WBSNodeTree & { order?: number }) => (a.order || 0) - (b.order || 0));
        node.children.forEach(sortChildren);
      }
      // Remove order property before returning
      delete node.order;
    };

    rootNodes.forEach(sortChildren);
    // Sort root nodes by order
    rootNodes.sort((a: WBSNodeTree & { order?: number }, b: WBSNodeTree & { order?: number }) => (a.order || 0) - (b.order || 0));

    return NextResponse.json(rootNodes);
  } catch (error) {
    console.error('Error fetching WBS nodes:', error);
    return NextResponse.json({ error: 'Failed to fetch WBS nodes' }, { status: 500 });
  }
}

// Helper function to ensure project root node exists
async function ensureProjectRootNode(projectId: number) {
  try {
    // Check if project root node already exists
    const existingRoot = await db.select().from(wbsNodes)
      .where(and(
        eq(wbsNodes.projectId, projectId),
        eq(wbsNodes.isProjectRoot, true)
      ))
      .limit(1);

    if (existingRoot.length === 0) {
      // Get project name
      const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      if (project.length > 0) {
        // Create project root node
        await db.insert(wbsNodes).values({
          projectId,
          name: project[0].name,
          order: 0,
          parentId: null,
          isProjectRoot: true
        });
      }
    }
  } catch (error: any) {
    // If is_project_root column doesn't exist yet, skip for now
    if (error?.message?.includes('is_project_root') || error?.code === '42703') {
      console.log('is_project_root column not found, skipping project root creation for now');
      return;
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const body = await request.json();
    const { projectId, parentId, name } = body;

    if (!projectId || !name) {
      return NextResponse.json({ error: 'Project ID and name are required' }, { status: 400 });
    }

    // Ensure project root node exists
    await ensureProjectRootNode(parseInt(projectId));

    // Calculate the correct order by querying existing siblings
    let finalOrder = 0;
    let actualParentId = parentId ? parseInt(parentId) : null;
    
    // If parentId is null, we need to make this a child of the project root node
    if (!actualParentId) {
      try {
        // Find the project root node
        const projectRoot = await db.select().from(wbsNodes)
          .where(and(
            eq(wbsNodes.projectId, parseInt(projectId)),
            eq(wbsNodes.isProjectRoot, true)
          ))
          .limit(1);
        
        if (projectRoot.length > 0) {
          actualParentId = projectRoot[0].id;
        }
      } catch (error: any) {
        // If is_project_root column doesn't exist, continue with null parentId
        if (error?.message?.includes('is_project_root') || error?.code === '42703') {
          console.log('is_project_root column not found, using null parentId');
          actualParentId = null;
        } else {
          throw error;
        }
      }
    }
    
    if (actualParentId) {
      // Get existing children of this parent
      const siblings = await db.select().from(wbsNodes)
        .where(and(
          eq(wbsNodes.projectId, parseInt(projectId)),
          eq(wbsNodes.parentId, actualParentId)
        ))
        .orderBy(wbsNodes.order);
      
      // Find the maximum order value and add 1 to place at the end
      const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.order)) : -1;
      finalOrder = maxOrder + 1;
    }

    const newNode: any = {
      projectId: parseInt(projectId),
      parentId: actualParentId,
      name,
      order: finalOrder
    };
    
    // Only add isProjectRoot if the column exists
    try {
      newNode.isProjectRoot = false;
    } catch (error) {
      // Column doesn't exist, skip this field
    }

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