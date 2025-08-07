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
    <div className="min-h-screen bg-white p-4">
      <div className="w-full space-y-6">

        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="projects" className="font-bold">Projects</TabsTrigger>
            <TabsTrigger value="wbs" className="font-bold">WBS Structure</TabsTrigger>
            <TabsTrigger value="gantt" className="font-bold">Gantt Chart</TabsTrigger>
          </TabsList>
          
          <TabsContent value="projects" className="space-y-4">
            <ProjectManager 
              onProjectSelect={setSelectedProjectId}
              selectedProjectId={selectedProjectId || undefined}
            />
          </TabsContent>
          
          <TabsContent value="wbs" className="space-y-4">
            {selectedProjectId ? (
              <WBSDemo projectId={selectedProjectId.toString()} />
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-gray-500 text-lg">
                    Please select a project from the Projects tab to view WBS structure
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="gantt" className="space-y-4">
            {selectedProjectId ? (
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
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-gray-500 text-lg">
                    Please select a project from the Projects tab to view Gantt chart
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function Home() {
  return <HomePage />;
}
