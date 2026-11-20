import { parseDuration } from "./model/parse";

/** A message as a transport gets it, from `orbSend`. Files are `File` objects, so a JSON transport doesn't send them. */
export interface OutgoingMessage {
  /** Matches the message the channel shows while it sends. The server's copy should carry it as `client-id`. */
  clientId: string;
  /** The point of view's participant, who writes the message */
  from: string;
  text: string;
  format: "text" | "html";
  /** The HTML of a rich message. Set when `format` is `html`. */
  html?: string;
  /** The id of the message this replies to */
  thread?: string;
  mentions: string[];
  command: { name: string; args: string } | null;
  respondents: string[];
  files: File[];
}

/** What a transport gets from the channel */
export interface TransportHandlers {
  /**
   * Shows the messages, participants and dividers in an HTML fragment. One whose
   * `id` is already shown replaces it, and the others are added at the end.
   */
  receive(html: string): void;
}

/**
 * Sends messages to a server and receives what the server sends back. Set it on
 * an `orb-channel` as `transport`, or describe one with `orb-channel-transport`.
 */
export interface MessageTransport {
  /**
   * Sends a message. Resolve once the server has it, or reject to show it as
   * failed, with the reason. The server's copy comes through `subscribe`, and
   * replaces the sending message when its `client-id` matches.
   */
  send(message: OutgoingMessage): Promise<void>;
  /** Starts receiving. Returns a function that stops. */
  subscribe(handlers: TransportHandlers): () => void;
  /**
   * Resolves to the HTML of the messages before `cursor`, oldest first, or to ""
   * when there are none. Without it, paging asks the app with `orbLoadMore`.
   */
  history?(cursor: string): Promise<string>;
}

const RECONNECT_MS = 2000;
const DEFAULT_INTERVAL_MS = 5000;

/**
 * The transport that an `orb-channel-transport` element describes. Its
 * attributes are read here, when the channel connects.
 */
export function declaredTransport(el: HTMLElement): MessageTransport {
  const type = el.getAttribute("type") ?? "form";
  const src = el.getAttribute("src") ?? undefined;
  const action = el.getAttribute("action") ?? undefined;
  const interval = parseDuration(el.getAttribute("interval") ?? "") ?? DEFAULT_INTERVAL_MS;
  let handlers: TransportHandlers | undefined;
  let source: EventSource | undefined;
  let socket: WebSocket | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let stopped = false;

  const receive = (html: string) => {
    if (html.trim()) handlers?.receive(html);
  };

  const post = async (message: OutgoingMessage) => {
    if (!action) throw new Error("This transport has no action to send to");
    const body = new FormData();
    body.set("client-id", message.clientId);
    body.set("from", message.from);
    body.set("text", message.text);
    body.set("format", message.format);
    if (message.html !== undefined) body.set("html", message.html);
    if (message.thread) body.set("thread", message.thread);
    for (const id of message.mentions) body.append("mention", id);
    for (const id of message.respondents) body.append("respondent", id);
    for (const file of message.files) body.append("file", file);
    const response = await fetch(action, { method: "POST", body });
    if (!response.ok) throw new Error(`The server answered ${response.status}`);
    receive(await response.text());
  };

  const sendOverSocket = (message: OutgoingMessage) => {
    if (socket?.readyState !== WebSocket.OPEN) throw new Error("The connection is closed");
    socket.send(
      JSON.stringify({
        clientId: message.clientId,
        from: message.from,
        text: message.text,
        format: message.format,
        html: message.html,
        thread: message.thread,
        mentions: message.mentions,
        command: message.command,
        respondents: message.respondents,
      }),
    );
  };

  const connect = (url: string) => {
    socket = new WebSocket(url);
    socket.onmessage = (event) => receive(String(event.data));
    socket.onclose = () => {
      if (!stopped) setTimeout(() => !stopped && connect(url), RECONNECT_MS);
    };
  };

  const poll = (url: string) => {
    const fetchOnce = () =>
      fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error(`The server answered ${response.status}`);
          return response.text();
        })
        .then(receive)
        .catch((error) => console.warn("orb-channel: polling failed", error));
    void fetchOnce();
    timer = setInterval(fetchOnce, interval);
  };

  return {
    async send(message) {
      if (type === "websocket") sendOverSocket(message);
      else await post(message);
    },
    subscribe(next) {
      handlers = next;
      stopped = false;
      if (type === "sse" && src) {
        source = new EventSource(src);
        source.onmessage = (event) => receive(event.data);
      } else if (type === "websocket" && src) {
        connect(src);
      } else if (type === "poll" && src) {
        poll(src);
      } else if (type !== "form" && !src) {
        console.warn(`orb-channel-transport: type="${type}" needs a src`);
      }
      return () => {
        stopped = true;
        handlers = undefined;
        source?.close();
        socket?.close();
        clearInterval(timer);
      };
    },
  };
}
