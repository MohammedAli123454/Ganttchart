"use client";

import React, { useState } from 'react';
import { Plus, FolderOpen, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useProjects, useCreateProject, useDeleteProject } from '@/lib/hooks/useProjects';

interface ProjectManagerProps {
  onProjectSelect: (projectId: number) => void;
  selectedProjectId?: number;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ 
  onProjectSelect, 
  selectedProjectId 
}) => {
  const { data: projects = [] } = useProjects();
  const createProjectMutation = useCreateProject();
  const deleteProjectMutation = useDeleteProject();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: ''
  });

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;
    
    try {
      const project = await createProjectMutation.mutateAsync({
        name: newProject.name,
        description: newProject.description || null,
      });
      
      setNewProject({ name: '', description: '' });
      setShowCreateForm(false);
      onProjectSelect(project.id);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      if (selectedProjectId === projectId) {
        onProjectSelect(0);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  return (
    <Card className="w-full mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Project Management</CardTitle>
        <div className="flex items-center gap-2">
          {selectedProjectId && (
            <span className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
              Project ID: {selectedProjectId}
            </span>
          )}
          <Button 
            size="sm" 
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Create Project Form */}
        {showCreateForm && (
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter project name..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="projectDescription">Description</Label>
                <Input
                  id="projectDescription"
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter project description..."
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleCreateProject}
                  disabled={!newProject.name.trim() || createProjectMutation.isPending}
                  size="sm"
                >
                  {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewProject({ name: '', description: '' });
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Selection */}
        <div>
          <Label>Select Project</Label>
          <Select
            value={selectedProjectId?.toString() || ''}
            onValueChange={(value) => onProjectSelect(parseInt(value))}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Choose a project to manage..." />
            </SelectTrigger>
            <SelectContent>
              {projects.length === 0 ? (
                <SelectItem value="0" disabled>
                  No projects available
                </SelectItem>
              ) : (
                projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span>{project.name}</span>
                      {project.description && (
                        <span className="text-xs text-gray-500 ml-2">
                          {project.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Project List */}
        {projects.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Recent Projects</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
              {projects.map((project) => (
                <Card 
                  key={project.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedProjectId === project.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onProjectSelect(project.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <FolderOpen className="w-4 h-4 text-blue-600" />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm truncate">
                            {project.name}
                          </h4>
                          {project.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Created: {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Settings className="w-3 h-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete
                          </Button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {selectedProjectId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              ✓ Project selected! You can now create and manage WBS structure below.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectManager;