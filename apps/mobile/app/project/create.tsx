import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProjectComposerForm } from '../../components/portfolio/ProjectComposerForm';

export default function CreateProjectScreen() {
  const { user } = useAuth();
  if (!user || (user.role !== 'designer' && user.role !== 'tailor')) return null;
  return <ProjectComposerForm role={user.role} />;
}
