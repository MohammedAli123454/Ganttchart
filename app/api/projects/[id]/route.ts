import { NextRequest, NextResponse } from 'next/server';
import { db, projects, wbsNodes, connectDb } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const { id } = await params;
    const projectId = parseInt(id);
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const { id } = await params;
    const projectId = parseInt(id);
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const [updatedProject] = await db
      .update(projects)
      .set({ 
        name, 
        description: description || null,
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId))
      .returning();

    if (!updatedProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update project root node name if it exists
    try {
      await db
        .update(wbsNodes)
        .set({ 
          name,
          updatedAt: new Date()
        })
        .where(and(
          eq(wbsNodes.projectId, projectId),
          eq(wbsNodes.isProjectRoot, true)
        ));
    } catch (error: any) {
      // If is_project_root column doesn't exist yet, skip
      if (error?.message?.includes('is_project_root') || error?.code === '42703') {
        console.log('is_project_root column not found, skipping project root name sync');
      } else {
        throw error;
      }
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const { id } = await params;
    const projectId = parseInt(id);
    
    const [deletedProject] = await db
      .delete(projects)
      .where(eq(projects.id, projectId))
      .returning();

    if (!deletedProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}