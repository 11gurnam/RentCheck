/** Conservative, local wording suggestions. No review text leaves the application. */
const replacements: [RegExp, string][] = [
  [/\bwhat the (?:fuck|f\*+ck)\b/gi, "what happened"],
  [/\bfuck(?:ing)? off\b/gi, "leave me alone"],
  [/\ban? (?:idiot|moron|bastard|asshole|arsehole|dumbass)\b/gi, "someone I found difficult to deal with"],
  [/\b(?:idiots|morons|bastards|assholes|arseholes|dumbasses)\b/gi, "people I found difficult to deal with"],
  [/\b(?:idiot|moron|bastard|asshole|arsehole|dumbass)\b/gi, "someone I found difficult to deal with"],
  [/\b(?:fucking|f\*+king|bloody|damn)\s+/gi, ""],
  [/\b(?:shitty|crappy)\b/gi, "poor"],
  [/\b(?:bullshit|bullsh\*t)\b/gi, "nonsense"],
  [/\b(?:shit|sh\*t|crap)\b/gi, "unacceptable"],
  [/\bshithole\b/gi, "place I strongly disliked"],
  [/\b(?:bakwaas|bakwas)\b/gi, "disappointing"],
  [/\b(?:chutiya|chutiye|chutiyas)\b/gi, "someone I found difficult to deal with"],
];
// Ambiguous insults, targeted slurs and threats require the author to revise the text.
const needsManualEdit = /\b(?:fuck|f\*+ck|bitch(?:es)?|cunt(?:s)?|motherfuck\w*|madarchod|bhenchod|behenchod|harami|kill you|kill him|kill her|rape you)\b/i;
export function reviewLanguage(text: string) {
  let suggestion = text;
  for (const [pattern, replacement] of replacements) {
    suggestion = suggestion.replace(pattern, replacement);
  }
  const manualEdit = needsManualEdit.test(suggestion);
  return { original: text, suggestion, changed: suggestion !== text, manualEdit, flagged: suggestion !== text || manualEdit };
}
