import { supabase } from './supabase';

export type SupportRequestCategory =
  | 'Order issue'
  | 'Product question'
  | 'Payment'
  | 'Pickup / installation'
  | 'Other';

export type SupportRequestStatus = 'open' | 'in_progress' | 'resolved';
export type SupportAttachment = {
  path: string;
  name: string;
  size: number;
  mime_type: string;
  signed_url?: string;
};

export type SupportRequestRecord = {
  id: string;
  user_id: string;
  category: SupportRequestCategory;
  subject: string;
  message: string;
  status: SupportRequestStatus;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  related_order_id: string | null;
  order_number: string | null;
  attachment_count: number;
};

export type SupportMessageRecord = {
  id: string;
  request_id: string;
  sender_user_id: string;
  sender_role: 'customer' | 'admin';
  message: string | null;
  attachments: SupportAttachment[];
  is_initial: boolean;
  created_at: string;
};

export type SupportOrderChoice = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
};

export type SupportRequestCursor = { lastMessageAt: string; id: string };
export type SupportMessageCursor = { createdAt: string; id: string };

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const maxFileBytes = 5 * 1024 * 1024;
const maxFilesPerRequest = 3;
const toError = (error: { message?: string } | null | undefined, fallback: string) =>
  error ? new Error(error.message || fallback) : null;

export function validateSupportFiles(files: File[], existingCount = 0): string | null {
  if (existingCount + files.length > maxFilesPerRequest) {
    return 'A support request can have up to 3 attachments.';
  }
  for (const file of files) {
    if (!allowedTypes.has(file.type)) return 'Attach JPEG, PNG, WebP or PDF files only.';
    if (!file.size || file.size > maxFileBytes) return 'Each attachment must be 5 MB or smaller.';
    if (file.name.trim().length > 200) return 'File names must be 200 characters or fewer.';
  }
  return null;
}

async function getSignedInUser(expectedUserId?: string) {
  if (!supabase) return { user: null, error: new Error('Support service is unavailable.') };
  const { data, error } = await supabase.auth.getUser();
  if (error) return { user: null, error: toError(error, 'Could not verify your sign-in.') };
  if (!data.user || (expectedUserId && data.user.id !== expectedUserId)) {
    return { user: null, error: new Error('Sign in to access support requests.') };
  }
  return { user: data.user, error: null };
}

async function uploadFiles(requestId: string, userId: string, files: File[]) {
  if (!supabase) return { data: [] as SupportAttachment[], paths: [] as string[], error: new Error('Support storage is unavailable.') };
  const validationError = validateSupportFiles(files);
  if (validationError) return { data: [] as SupportAttachment[], paths: [] as string[], error: new Error(validationError) };
  const uploaded: SupportAttachment[] = [];
  for (const file of files) {
    const path = `${userId}/${requestId}/${crypto.randomUUID()}`;
    const { error } = await supabase.storage.from('support-attachments').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      if (uploaded.length) await supabase.storage.from('support-attachments').remove(uploaded.map((item) => item.path));
      return { data: [] as SupportAttachment[], paths: [] as string[], error: toError(error, 'Could not upload the attachment.') };
    }
    uploaded.push({ path, name: file.name.slice(0, 200), size: file.size, mime_type: file.type });
  }
  return { data: uploaded, paths: uploaded.map((item) => item.path), error: null };
}

export async function listMySupportOrderChoices(expectedUserId?: string): Promise<{
  data: SupportOrderChoice[];
  error: Error | null;
}> {
  const { user, error: authError } = await getSignedInUser(expectedUserId);
  if (!user || !supabase) return { data: [], error: authError };
  const { data, error } = await supabase
    .from('orders')
    .select('id,order_number,status,total,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  return { data: (data || []) as SupportOrderChoice[], error: toError(error, 'Could not load your orders.') };
}

export async function createCustomerSupportRequest(input: {
  category: SupportRequestCategory;
  subject: string;
  message: string;
  relatedOrderId?: string | null;
  files?: File[];
  expectedUserId?: string;
}): Promise<{ id: string | null; error: Error | null; attachmentError?: Error | null }> {
  const { user, error: authError } = await getSignedInUser(input.expectedUserId);
  if (!user || !supabase) return { id: null, error: authError };
  const { data, error } = await supabase.rpc('create_customer_support_request', {
    p_category: input.category,
    p_subject: input.subject.trim(),
    p_message: input.message.trim(),
    p_related_order_id: input.relatedOrderId || null,
  });
  if (error || !data) return { id: null, error: toError(error, 'Could not submit your support request.') || new Error('Request reference was not returned.') };
  const requestId = String(data);
  const files = input.files || [];
  if (!files.length) return { id: requestId, error: null, attachmentError: null };
  const upload = await uploadFiles(requestId, user.id, files);
  if (upload.error) return { id: requestId, error: null, attachmentError: upload.error };
  const attachResult = await supabase.rpc('attach_customer_support_request_files', {
    p_request_id: requestId,
    p_attachments: upload.data.map(({ path, name, size, mime_type }) => ({ path, name, size, mime_type })),
  });
  if (attachResult.error) {
    await supabase.storage.from('support-attachments').remove(upload.paths);
    return { id: requestId, error: null, attachmentError: toError(attachResult.error, 'The request was received, but the attachments could not be added.') };
  }
  return { id: requestId, error: null, attachmentError: null };
}

export async function listMySupportRequests(expectedUserId?: string, cursor?: SupportRequestCursor | null): Promise<{
  data: SupportRequestRecord[];
  error: Error | null;
  hasMore: boolean;
  cursor: SupportRequestCursor | null;
}> {
  const { user, error: authError } = await getSignedInUser(expectedUserId);
  if (!user || !supabase) return { data: [], error: authError, hasMore: false, cursor: null };
  let query = supabase
    .from('customer_support_requests')
    .select('id,user_id,category,subject,message,status,created_at,updated_at,last_message_at,related_order_id,attachment_count')
    .eq('user_id', user.id)
    .order('last_message_at', { ascending: false })
    .order('id', { ascending: false });
  if (cursor) {
    query = query.or(`last_message_at.lt.${cursor.lastMessageAt},and(last_message_at.eq.${cursor.lastMessageAt},id.lt.${cursor.id})`);
  }
  const pageSize = 50;
  const { data, error } = await query.limit(pageSize + 1);
  if (error) return { data: [], error: toError(error, 'Could not load your support requests.'), hasMore: false, cursor: null };
  const fetchedRows = (data || []) as Omit<SupportRequestRecord, 'order_number'>[];
  const hasMore = fetchedRows.length > pageSize;
  const rows = fetchedRows.slice(0, pageSize);
  const orderIds = [...new Set(rows.map((row) => row.related_order_id).filter((id): id is string => Boolean(id)))];
  let orderNumbers = new Map<string, string>();
  if (orderIds.length) {
    const { data: orders } = await supabase.from('orders').select('id,order_number').eq('user_id', user.id).in('id', orderIds);
    orderNumbers = new Map((orders || []).map((order) => [String(order.id), String(order.order_number)]));
  }
  const last = rows.at(-1);
  return {
    data: rows.map((row) => ({ ...row, order_number: row.related_order_id ? orderNumbers.get(row.related_order_id) || null : null })),
    error: null,
    hasMore,
    cursor: last ? { lastMessageAt: last.last_message_at, id: last.id } : null,
  };
}

export async function getSupportRequest(requestId: string, expectedUserId?: string): Promise<{
  data: SupportRequestRecord | null;
  error: Error | null;
}> {
  const { user, error: authError } = await getSignedInUser(expectedUserId);
  if (!user || !supabase) return { data: null, error: authError };
  const { data, error } = await supabase
    .from('customer_support_requests')
    .select('id,user_id,category,subject,message,status,created_at,updated_at,last_message_at,related_order_id,attachment_count')
    .eq('id', requestId)
    .maybeSingle();
  if (error) return { data: null, error: toError(error, 'Could not load this support request.') };
  if (!data) return { data: null, error: new Error('Support request was not found.') };
  let orderNumber: string | null = null;
  if (data.related_order_id) {
    const { data: order } = await supabase.from('orders').select('order_number').eq('id', data.related_order_id).maybeSingle();
    orderNumber = order?.order_number ? String(order.order_number) : null;
  }
  return { data: { ...(data as Omit<SupportRequestRecord, 'order_number'>), order_number: orderNumber }, error: null };
}

export async function listSupportMessages(requestId: string, expectedUserId?: string, cursor?: SupportMessageCursor | null): Promise<{
  data: SupportMessageRecord[];
  error: Error | null;
  hasMore: boolean;
  cursor: SupportMessageCursor | null;
}> {
  const { user, error: authError } = await getSignedInUser(expectedUserId);
  if (!user || !supabase) return { data: [], error: authError, hasMore: false, cursor: null };
  let query = supabase
    .from('customer_support_messages')
    .select('id,request_id,sender_user_id,sender_role,message,attachments,is_initial,created_at')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }
  const pageSize = 100;
  const { data, error } = await query.limit(pageSize + 1);
  if (error) return { data: [], error: toError(error, 'Could not load the support conversation.'), hasMore: false, cursor: null };
  const fetchedMessages = (data || []) as SupportMessageRecord[];
  const hasMore = fetchedMessages.length > pageSize;
  const newestFirst = fetchedMessages.slice(0, pageSize);
  const oldest = newestFirst.at(-1);
  const messages = newestFirst.reverse();
  const signedMessages = await Promise.all(messages.map(async (message) => {
    const attachments = await Promise.all((Array.isArray(message.attachments) ? message.attachments : []).map(async (attachment) => {
      const { data: signed, error: signedError } = await supabase!.storage.from('support-attachments').createSignedUrl(attachment.path, 3600);
      return { ...attachment, signed_url: signedError ? undefined : signed?.signedUrl };
    }));
    return { ...message, attachments };
  }));
  return {
    data: signedMessages,
    error: null,
    hasMore,
    cursor: oldest ? { createdAt: oldest.created_at, id: oldest.id } : null,
  };
}

export async function sendSupportMessage(input: {
  requestId: string;
  message: string;
  files?: File[];
  expectedUserId?: string;
}): Promise<{ error: Error | null }> {
  const { user, error: authError } = await getSignedInUser(input.expectedUserId);
  if (!user || !supabase) return { error: authError };
  const files = input.files || [];
  const validationError = validateSupportFiles(files);
  if (validationError) return { error: new Error(validationError) };
  let uploaded: { data: SupportAttachment[]; paths: string[]; error: Error | null } = { data: [], paths: [], error: null };
  if (files.length) {
    uploaded = await uploadFiles(input.requestId, user.id, files);
    if (uploaded.error) return { error: uploaded.error };
  }
  const { error } = await supabase.rpc('add_customer_support_message', {
    p_request_id: input.requestId,
    p_message: input.message.trim(),
    p_attachments: uploaded.data.map(({ path, name, size, mime_type }) => ({ path, name, size, mime_type })),
  });
  if (error) {
    if (uploaded.paths.length) await supabase.storage.from('support-attachments').remove(uploaded.paths);
    return { error: toError(error, 'Could not send your reply.') };
  }
  return { error: null };
}
