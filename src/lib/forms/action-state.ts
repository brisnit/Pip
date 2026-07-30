/**
 * Shared shape for `useActionState` results.
 *
 * This lives outside the `"use server"` action modules on purpose: a server-action
 * file may only export async functions, so the initial-state constants and the
 * type cannot live alongside the actions themselves.
 */
export type ActionState = {
  error: string | null;
  message: string | null;
};

export const emptyActionState: ActionState = { error: null, message: null };

export function actionFailure(error: string): ActionState {
  return { error, message: null };
}

export function actionSuccess(message: string): ActionState {
  return { error: null, message };
}
