
"use client";

import React, { useState } from 'react';
import GanttChart from '@/components/GanttChart';
import ProjectManager from '@/components/project-manager';
import WBSDemo from '@/components/wbs-tree';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function HomePage() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Project Management System
            </CardTitle>
            <p className="text-center text-gray-600">
              Create projects, build WBS structures, and visualize with Gantt charts
            </p>
          </CardHeader>
        </Card>

        <ProjectManager 
          onProjectSelect={setSelectedProjectId}
          selectedProjectId={selectedProjectId || undefined}
        />

        {selectedProjectId && (
          <Tabs defaultValue="wbs" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="wbs">WBS Structure</TabsTrigger>
              <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
            </TabsList>
            
            <TabsContent value="wbs" className="space-y-4">
              <WBSDemo projectId={selectedProjectId.toString()} />
            </TabsContent>
            
            <TabsContent value="gantt" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gantt Chart View</CardTitle>
                  <p className="text-sm text-gray-600">
                    Project {selectedProjectId} - Static Gantt Chart (Original Implementation)
                  </p>
                </CardHeader>
                <CardContent>
                  <GanttChart />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {!selectedProjectId && (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-gray-500 text-lg">
                Select or create a project to start building your WBS structure
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return <HomePage />;
}
