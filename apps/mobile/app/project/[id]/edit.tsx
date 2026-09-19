import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { getPortfolioProject } from '@fashub/api-client';
import type { PortfolioProjectDetail } from '@fashub/types';
import { ProjectComposerForm } from '../../../components/portfolio/ProjectComposerForm';
import { LoadingState } from '../../../components/LoadingState';
import { useTheme } from '../../../theme/ThemeProvider';

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [project, setProject] = useState<PortfolioProjectDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    getPortfolioProject(id).then((res) => setProject(res.project)).catch(() => setProject(null));
  }, [id]);

  if (!user || (user.role !== 'designer' && user.role !== 'tailor')) return null;
  if (!project) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top']}>
        <LoadingState tint={{ accent: colors.gold, text: colors.inkSoft }} />
      </SafeAreaView>
    );
  }

  return <ProjectComposerForm role={user.role} project={project} />;
}
