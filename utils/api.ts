const API_BASE = "http://localhost:8000/api/v1";

export interface User {
  id: number;
  name: string;
  last_name: string;
  username: string;
  public_key: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Option {
  id: number;
  election_id: number;
  option_text: string;
  option_order: number;
  created_at: string;
}

export interface Election {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  options: Option[];
}

export interface ElectionStatus {
  id: number;
  title: string;
  is_active: boolean;
  is_open: boolean;
  start_date: string;
  end_date: string;
}

export interface BlindTokenResponse {
  id: number;
  user_id: number;
  election_id: number;
  blinded_token: string;
  signed_token: string | null;
  is_used: boolean;
  created_at: string;
  used_at: string | null;
}

export interface VoteResponse {
  id: number;
  election_id: number;
  created_at: string;
}

export interface VoteWithReceiptResponse {
  vote_id: number;
  election_id: number;
  receipt_id: number;
  receipt_hash: string;
  voted_at: string;
}

export interface VotingReceiptResponse {
  id: number;
  user_id: number;
  election_id: number;
  receipt_hash: string;
  digital_signature: string;
  voted_at: string;
}

export async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Error desconocido" }));
    throw new Error(error.detail || `Error ${res.status}`);
  }

  return res.json();
}

export async function getCurrentUser(): Promise<User> {
  return fetchAPI<User>("/users/me");
}

export async function updateUser(
  userId: number,
  data: { name?: string; last_name?: string; username?: string }
): Promise<User> {
  return fetchAPI<User>(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function updatePublicKey(
  userId: number,
  publicKey: string
): Promise<User> {
  return fetchAPI<User>(`/users/${userId}/public_key`, {
    method: "PUT",
    body: JSON.stringify({ public_key: publicKey }),
  });
}

export async function getActiveElections(): Promise<Election[]> {
  return fetchAPI<Election[]>("/elections/active");
}

export async function getElectionStatus(
  electionId: number
): Promise<ElectionStatus> {
  return fetchAPI<ElectionStatus>(`/elections/${electionId}/status`);
}

export async function checkIfVoted(
  electionId: number
): Promise<{ has_voted: boolean; election_id: number }> {
  return fetchAPI<{ has_voted: boolean; election_id: number }>(
    `/voting/has-voted/${electionId}`
  );
}

export async function createBlindToken(
  userId: number,
  electionId: number,
  blindedToken: string
): Promise<BlindTokenResponse> {
  return fetchAPI<BlindTokenResponse>("/voting/blind-tokens", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      election_id: electionId,
      blinded_token: blindedToken,
    }),
  });
}

export async function getMyBlindToken(
  electionId: number
): Promise<BlindTokenResponse> {
  return fetchAPI<BlindTokenResponse>(`/voting/blind-tokens/me/${electionId}`);
}

export async function castVoteWithReceipt(data: {
  user_id: number;
  election_id: number;
  option_id: number;
  unblinded_signature: string;
  vote_hash: string;
  encrypted_vote: string;
  receipt_hash: string;
  receipt_signature: string;
}): Promise<VoteWithReceiptResponse> {
  return fetchAPI<VoteWithReceiptResponse>("/voting/votes/complete", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// DEPRECATED: Use castVoteWithReceipt instead
export async function castVote(data: {
  election_id: number;
  option_id: number;
  unblinded_signature: string;
  vote_hash: string;
  encrypted_vote: string;
}): Promise<VoteResponse> {
  throw new Error("DEPRECATED: Use castVoteWithReceipt for atomic vote + receipt");
}

// DEPRECATED: Use castVoteWithReceipt instead
export async function createReceipt(data: {
  user_id: number;
  election_id: number;
  receipt_hash: string;
  digital_signature: string;
}): Promise<VotingReceiptResponse> {
  throw new Error("DEPRECATED: Use castVoteWithReceipt for atomic vote + receipt");
}

export async function getMyReceipt(
  electionId: number
): Promise<VotingReceiptResponse> {
  return fetchAPI<VotingReceiptResponse>(`/voting/receipts/me/${electionId}`);
}

// ============================================================================
// ADMIN API FUNCTIONS
// ============================================================================

export async function getAllUsers(
  skip: number = 0,
  limit: number = 50
): Promise<User[]> {
  return fetchAPI<User[]>(`/users/?skip=${skip}&limit=${limit}`);
}

export async function deleteUser(userId: number): Promise<void> {
  await fetchAPI<void>(`/users/${userId}`, {
    method: "DELETE",
  });
}

export async function setUserAdmin(
  userId: number,
  isAdmin: boolean
): Promise<User> {
  return fetchAPI<User>(`/users/${userId}/admin`, {
    method: "PUT",
    body: JSON.stringify({ is_admin: isAdmin }),
  });
}

// Elections Management (Admin)
export interface ElectionCreate {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  blind_signature_key?: string; // Optional: auto-generated if not provided
  options: { option_text: string; option_order: number }[];
}

export interface ElectionUpdate {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export interface OptionWithVoteCount {
  id: number;
  election_id: number;
  option_text: string;
  option_order: number;
  created_at: string;
  vote_count: number;
}

export interface ElectionResults {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  total_votes: number;
  options: OptionWithVoteCount[];
}

export async function getAllElections(
  skip: number = 0,
  limit: number = 50
): Promise<Election[]> {
  return fetchAPI<Election[]>(`/elections/?skip=${skip}&limit=${limit}`);
}

export async function createElection(
  data: ElectionCreate
): Promise<Election> {
  return fetchAPI<Election>("/elections/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateElection(
  electionId: number,
  data: ElectionUpdate
): Promise<Election> {
  return fetchAPI<Election>(`/elections/${electionId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteElection(electionId: number): Promise<void> {
  await fetchAPI<void>(`/elections/${electionId}`, {
    method: "DELETE",
  });
}

export async function toggleElectionActive(
  electionId: number,
  isActive: boolean
): Promise<Election> {
  return fetchAPI<Election>(`/elections/${electionId}/activate`, {
    method: "PUT",
    body: JSON.stringify({ is_active: isActive }),
  });
}

export async function getElectionResults(
  electionId: number
): Promise<ElectionResults> {
  return fetchAPI<ElectionResults>(`/elections/${electionId}/results`);
}

export interface RegenerateKeyResponse {
  election_id: number;
  election_title: string;
  message: string;
  had_valid_key_before: boolean;
  public_key: string;
  warning: string;
}

export async function regenerateElectionKey(
  electionId: number
): Promise<RegenerateKeyResponse> {
  return fetchAPI<RegenerateKeyResponse>(`/elections/${electionId}/regenerate-key`, {
    method: "PUT",
  });
}

export async function getElectionPublicKey(
  electionId: number
): Promise<{ election_id: number; public_key: string; key_type: string }> {
  return fetchAPI(`/elections/${electionId}/public-key`);
}

// Blind Token Management (Admin) - Audit Only
// Note: Tokens are now signed automatically, these functions are for auditing

// DEPRECATED: Tokens are now auto-signed. This will usually return empty array.
export async function getPendingBlindTokens(
  electionId?: number
): Promise<BlindTokenResponse[]> {
  console.warn("getPendingBlindTokens is deprecated - tokens are now auto-signed");
  const url = electionId
    ? `/voting/blind-tokens/pending?election_id=${electionId}`
    : "/voting/blind-tokens/pending";
  return fetchAPI<BlindTokenResponse[]>(url);
}

export async function getAllBlindTokens(
  electionId?: number
): Promise<BlindTokenResponse[]> {
  const url = electionId
    ? `/voting/blind-tokens/all?election_id=${electionId}`
    : "/voting/blind-tokens/all";
  return fetchAPI<BlindTokenResponse[]>(url);
}

// DEPRECATED: Tokens are now auto-signed at creation time
export async function signBlindToken(
  tokenId: number,
  signedToken: string
): Promise<BlindTokenResponse> {
  console.warn("signBlindToken is deprecated - tokens are now auto-signed");
  return fetchAPI<BlindTokenResponse>(`/voting/blind-tokens/${tokenId}/sign`, {
    method: "PUT",
    body: JSON.stringify({
      blind_token_id: tokenId,
      signed_token: signedToken,
    }),
  });
}
