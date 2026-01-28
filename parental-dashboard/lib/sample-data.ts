/**
 * Sample data for SendWise Parental Dashboard
 * For testing and demonstration purposes
 */

import { Incident, Child, DashboardStats, CategoryStats } from './types';

export const sampleChild: Child = {
  id: 'child-001',
  name: 'Alex',
  age: 13,
};

export const sampleIncidents: Incident[] = [
  {
    id: 'inc-001',
    childId: 'child-001',
    timestamp: new Date('2026-01-28T15:45:00'),
    platform: 'instagram',
    category: 'self_harm',
    severity: 'urgent',
    detectedText: 'Expression of immediate danger',
    action: 'edited',
    detections: [
      {
        type: 'urgent_suicide_threat',
        matches: ['immediate harm expression']
      }
    ],
    recommendation: '🚨 URGENT: Contact emergency services (988 Suicide Hotline or 911) immediately',
    resources: [
      '988 Suicide & Crisis Lifeline: Call or text 988',
      'Crisis Text Line: Text HOME to 741741',
      'If immediate danger: Call 911'
    ]
  },
  {
    id: 'inc-002',
    childId: 'child-001',
    timestamp: new Date('2026-01-28T14:15:00'),
    platform: 'whatsapp',
    category: 'privacy_risk',
    severity: 'critical',
    detectedText: 'Shared phone number: 555-***-1234',
    action: 'sent_anyway',
    detections: [
      {
        type: 'phone_number',
        matches: ['phone number pattern']
      }
    ],
    recommendation: '🚨 CRITICAL: Talk to child about online privacy immediately',
    resources: [
      'Discuss never sharing personal information with strangers',
      'Review all recent conversations',
      'Set clear privacy rules'
    ]
  },
  {
    id: 'inc-003',
    childId: 'child-001',
    timestamp: new Date('2026-01-28T13:30:00'),
    platform: 'discord',
    category: 'meeting_stranger',
    severity: 'critical',
    detectedText: 'Agreement to meet: "ok let\'s meet at the mall"',
    action: 'blocked',
    detections: [
      {
        type: 'meeting_agreement',
        matches: ['agreement to meet']
      },
      {
        type: 'location_sharing',
        matches: ['specific location mentioned']
      }
    ],
    recommendation: '🚨 CRITICAL: Child planning to meet stranger - intervene immediately',
    resources: [
      'Talk to child IMMEDIATELY',
      'Ask who they\'re talking to online',
      'Review all recent messages',
      'Consider reporting to CyberTipline (NCMEC): 1-800-843-5678'
    ]
  },
  {
    id: 'inc-004',
    childId: 'child-001',
    timestamp: new Date('2026-01-28T12:00:00'),
    platform: 'snapchat',
    category: 'risky_behavior',
    severity: 'high',
    detectedText: 'Discussion of substance use',
    action: 'edited',
    detections: [
      {
        type: 'drugs',
        matches: ['substance reference']
      }
    ],
    recommendation: '⚠️ HIGH: Substance use detected - intervention needed',
    resources: [
      'Have a serious conversation about substance abuse',
      'Consider drug/alcohol counseling',
      'Discuss legal consequences',
      'Monitor social circles'
    ]
  },
  {
    id: 'inc-005',
    childId: 'child-001',
    timestamp: new Date('2026-01-28T10:30:00'),
    platform: 'tiktok',
    category: 'cyberbullying',
    severity: 'medium',
    detectedText: 'Mean comment toward another user',
    action: 'sent_anyway',
    detections: [
      {
        type: 'harassment',
        matches: ['insulting language']
      }
    ],
    recommendation: '⚠️ Talk to child about online kindness',
    resources: []
  },
  {
    id: 'inc-006',
    childId: 'child-001',
    timestamp: new Date('2026-01-27T20:15:00'),
    platform: 'instagram',
    category: 'self_harm',
    severity: 'high',
    detectedText: 'Expression of depression',
    action: 'edited',
    detections: [
      {
        type: 'severe_depression',
        matches: ['hopelessness expression']
      }
    ],
    recommendation: '⚠️ HIGH PRIORITY: Schedule professional help within 24-48 hours',
    resources: [
      'Contact therapist or counselor',
      'Talk to child about feelings',
      'Monitor closely'
    ]
  },
  {
    id: 'inc-007',
    childId: 'child-001',
    timestamp: new Date('2026-01-27T18:45:00'),
    platform: 'discord',
    category: 'privacy_risk',
    severity: 'high',
    detectedText: 'Shared email address',
    action: 'sent_anyway',
    detections: [
      {
        type: 'email',
        matches: ['email pattern']
      }
    ],
    recommendation: '⚠️ HIGH: Child sharing personal contact information',
    resources: [
      'Discuss email privacy',
      'Review online safety rules'
    ]
  },
  {
    id: 'inc-008',
    childId: 'child-001',
    timestamp: new Date('2026-01-27T16:20:00'),
    platform: 'whatsapp',
    category: 'meeting_stranger',
    severity: 'high',
    detectedText: 'Time arrangement: "see you tomorrow"',
    action: 'blocked',
    detections: [
      {
        type: 'time_arrangement',
        matches: ['temporal coordination']
      }
    ],
    recommendation: '⚠️ CONCERN: Child agreeing to meet someone',
    resources: [
      'Talk to child about who they\'re meeting',
      'Verify it\'s a known, safe person'
    ]
  }
];

export const sampleStats: DashboardStats = {
  totalIncidents: 45,
  criticalIncidents: 3,
  highPriorityIncidents: 8,
  messagesPrevented: 42,
  lastIncidentTime: new Date('2026-01-28T15:45:00')
};

export const sampleCategoryStats: CategoryStats[] = [
  {
    category: 'self_harm',
    count: 2,
    trend: 'up',
    mostRecentSeverity: 'urgent'
  },
  {
    category: 'privacy_risk',
    count: 3,
    trend: 'stable',
    mostRecentSeverity: 'critical'
  },
  {
    category: 'meeting_stranger',
    count: 2,
    trend: 'up',
    mostRecentSeverity: 'critical'
  },
  {
    category: 'risky_behavior',
    count: 1,
    trend: 'down',
    mostRecentSeverity: 'high'
  },
  {
    category: 'cyberbullying',
    count: 42,
    trend: 'down',
    mostRecentSeverity: 'medium'
  }
];
