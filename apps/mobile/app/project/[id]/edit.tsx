import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
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
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <LoadingState tint={{ accent: colors.gold, text: colors.inkSoft }} />
      </View>
    );
  }

  return <ProjectComposerForm role={user.role} project={project} />;
}
