import { NextRequest, NextResponse } from 'next/server';
import { db, projects, NewProject, connectDb } from '@/lib/db';

export async function GET() {
  try {
    await connectDb();
    const allProjects = await db.select().from(projects).orderBy(projects.createdAt);
    return NextResponse.json(allProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const newProject: NewProject = {
      name,
      description: description || null
    };

    const [createdProject] = await db.insert(projects).values(newProject).returning();

    return NextResponse.json(createdProject);
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}