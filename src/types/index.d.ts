import e from "express";

// Session Types
export interface UserData {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  business_name: string;
  business_duration: string;
  cac_number: string;
  loan_amount: string;
  business_address: string;
  industry: string;
  twitter: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  referral: string;
  whatsapp_number: string;
  payment_reference?: string;
  payment_amount?: number;
  payment_status?: "pending" | "confirmed" | "failed";
  payment_confirmed_at?: string;
}

export interface otpStorage {
  otp: string;
  timestamp: number;
  attempts: number;
}

export interface UserSession {
  state: string;
  data: UserData;
  step?: number;
  createdAt?: Date;
  lastActivity?: Date;
  whatsappPhoneNumber?: string;
}

// Interactive Message Types
export interface InteractiveData {
  type: "button" | "list";
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "list" | "button";
    header?: {
      type: "text";
      text: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      button?: string;
      buttons?: Array<{
        type: "reply";
        reply: {
          id: string;
          title: string;
        };
      }>;
      sections?: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}

// WhatsApp Webhook Types
export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "interactive" | "video" | "document" | "image" | "audio";
  text?: {
    body: string;
  };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  video?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  document?: {
    id: string;
    mime_type: string;
    sha256: string;
    filename: string;
    caption?: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  audio?: {
    id: string;
    mime_type: string;
    sha256: string;
  };
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: WhatsAppMessage[];
      };
      field: string;
    }>;
  }>;
}

// API Response Types
export interface ApiResponse<T = any> {
  status: boolean;
  message?: string;
  data?: T;
}

export interface PaymentLinkResponse {
  payment_link: string;
  reference: string;
}

// Message Type
export type MessageType =
  | "text"
  | "interactive"
  | "video"
  | "document"
  | "image"
  | "audio";
