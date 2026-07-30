import { fromEvent, merge } from "rxjs";
import { filter, map, scan, debounceTime, tap, share } from "rxjs/operators";

function searchSelect(
  currentChar: string,
  searchString: string,
  options: string[],
  currentIndex = -1,
) {
  const newSearchString = searchString + currentChar.toLowerCase();
  const allSameChar = newSearchString
    .split("")
    .every((char) => char === currentChar.toLowerCase());

  if (allSameChar) {
    const matchingIndices = options
      .map((opt, idx) => ({ idx, text: opt.toLowerCase() }))
      .filter((opt) => opt.text.startsWith(currentChar.toLowerCase()))
      .map((opt) => opt.idx);

    if (matchingIndices.length === 0) return currentIndex;

    const nextMatch = matchingIndices.find((idx) => idx > currentIndex);
    return nextMatch !== undefined ? nextMatch : matchingIndices[0];
  }

  const matchIndex = options.findIndex((opt) =>
    opt.toLowerCase().startsWith(newSearchString),
  );

  return matchIndex !== -1 ? matchIndex : currentIndex;
}

export function createSelectSearch(
  element: HTMLElement,
  options: string[],
  resetDelay = 500,
) {
  const keydown$ = fromEvent<KeyboardEvent>(element, "keydown").pipe(
    filter((event) => {
      const key = event.key;
      return (
        key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
      );
    }),
    tap((event) => event.preventDefault()),
    map((event) => event.key),
    share(),
  );

  const reset$ = keydown$.pipe(
    debounceTime(resetDelay),
    map(() => ({ type: "RESET", key: "" })),
  );

  const action$ = merge(
    keydown$.pipe(map((key) => ({ type: "KEY", key }))),
    reset$,
  );

  return action$.pipe(
    scan(
      (state, action) => {
        if (action.type === "RESET") {
          return {
            ...state,
            searchString: "",
          };
        }

        const newSearchString = state.searchString + action.key.toLowerCase();
        const selectedIndex = searchSelect(
          action.key,
          state.searchString,
          options,
          state.selectedIndex,
        );

        return {
          selectedIndex,
          searchString: newSearchString,
          key: action.key,
        };
      },
      {
        selectedIndex: -1,
        searchString: "",
        key: "",
      },
    ),
    filter((state) => state.key !== ""),
  );
}
