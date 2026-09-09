/**
 * Matches POST /api/projects/[projectId]/engagement exactly — the single
 * shared funnel-event logging path both web and mobile fire through (backs
 * the marketplace-intent ranking model's intent score). project_view can
 * fire anonymously; every other type requires a real userId.
 */
export type ProjectEngagementType =
  | 'project_view'
  | 'project_save'
  | 'project_detail_zoom'
  | 'project_share'
  | 'project_inquiry_sent'
  | 'project_commission_booked'; // scaffolded — nothing fires this yet, milestone payments don't exist
