export type ConversationState =
  | "idle"
  | "waiting_input"
  | "collecting_hp_info"
  | "confirming_hp"
  | "generating_hp";

export type IntentType =
  | "chat"
  | "generate_hp"
  | "post_sns"
  | "view_status"
  | "academy"
  | "switch_claw"
  | "help";

export type MessageDirection = "inbound" | "outbound";
export type ContentType = "text" | "image" | "file" | "system";

export interface BotSession {
  id: string;
  user_id: string | null;
  telegram_user_id: number;
  telegram_chat_id: number;
  active_claw_id: string | null;
  conversation_state: ConversationState;
  state_data: Record<string, unknown>;
  is_linked: boolean;
  linked_at: string | null;
  last_message_at: string | null;
}

export interface BotMessage {
  id: string;
  bot_session_id: string;
  user_id: string | null;
  direction: MessageDirection;
  active_claw_id: string | null;
  content: string;
  content_type: ContentType;
  telegram_message_id: number | null;
  llm_model: string | null;
  llm_tokens_used: number | null;
  llm_cost_usd: number | null;
  created_at: string;
}

export interface ClawRecord {
  id: string;
  claw_no: number;
  name_jp: string;
  name_en: string;
  name_romaji: string;
  category: string;
  dossier: Record<string, string>;
  image_url: string | null;
}

export interface HpGenerationState {
  step: "business_name" | "business_type" | "description" | "template" | "confirm";
  business_name?: string;
  business_type?: string;
  description?: string;
  template?: string;
}
