export interface GenerationContext {
  prompt: string
  payments: string
  referral: string
  notification: string
  category: string
}

export interface GeneratedFiles {
  miniapp_html: string
  bot_py: string
  scheduler_py: string
  requirements_txt: string
  env_example: string
  setup_md: string
  tonconnect_manifest_json?: string
}

export interface GenerationResult {
  appName: string
  appDescription: string
  track: 1 | 2
  files: GeneratedFiles
}

export interface Project {
  id: string
  user_id: string
  app_name: string
  app_description: string | null
  track: 1 | 2
  prompt: string
  payments: string | null
  referral: string | null
  notification: string | null
  category: string | null
  created_at: string
  updated_at: string
}

export interface ProjectFile {
  id: string
  project_id: string
  filename: string
  content: string
  updated_at: string
}

export type GenerationStep =
  | { step: 'naming'; label: 'Getting app name...' }
  | { step: 'miniapp'; label: 'Generating Mini App frontend...' }
  | { step: 'bot'; label: 'Generating Python bot...' }
  | { step: 'manifest'; label: 'Generating TON Connect manifest...' }
  | { step: 'support'; label: 'Generating support files...' }
  | { step: 'validating'; label: 'Running 22 checks...' }
  | { step: 'done'; label: 'Complete!' }
