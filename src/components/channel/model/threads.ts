import type { MessageModel, ThreadModel } from "./types";

/**
 * The threads among messages, in DOM order. A reply's `thread` is the id of the
 * message it answers, and a reply can answer another reply. The top-level
 * messages are the roots. A reply whose chain doesn't reach a root, because a
 * message is missing, isn't in any thread until the message arrives.
 */
export function threadsOf(messages: MessageModel[]): { roots: MessageModel[]; threads: Map<string, ThreadModel> } {
  const byId = new Map<string, MessageModel>();
  for (const message of messages) if (message.id && !byId.has(message.id)) byId.set(message.id, message);

  /** The root a message's chain reaches, and how many replies deep it is. Undefined when the chain is broken or cyclic. */
  const locate = (message: MessageModel, path: Set<MessageModel>): { root: MessageModel; depth: number } | undefined => {
    if (!message.thread) return { root: message, depth: 0 };
    if (path.has(message)) return undefined;
    const parent = byId.get(message.thread);
    if (!parent) return undefined;
    path.add(message);
    const up = locate(parent, path);
    return up && { root: up.root, depth: up.depth + 1 };
  };

  const roots: MessageModel[] = [];
  const threads = new Map<string, ThreadModel>();
  const threadOf = (root: MessageModel): ThreadModel => {
    let thread = threads.get(root.id);
    if (!thread) threads.set(root.id, (thread = { root, replies: [], count: 0, missing: 0 }));
    return thread;
  };

  for (const message of messages) {
    if (!message.thread) {
      roots.push(message);
      continue;
    }
    const located = locate(message, new Set());
    if (!located || !located.root.id) continue;
    threadOf(located.root).replies.push({ model: message, depth: located.depth });
  }

  for (const root of roots) {
    if (!root.id || (!threads.has(root.id) && root.threadCount === undefined)) continue;
    const thread = threadOf(root);
    const times = thread.replies.map((reply) => reply.model.time).filter((time): time is number => time !== undefined);
    thread.count = root.threadCount ?? thread.replies.length;
    thread.missing = Math.max(0, thread.count - thread.replies.length);
    thread.last = root.threadLast ?? (times.length ? Math.max(...times) : undefined);
  }

  return { roots, threads };
}
