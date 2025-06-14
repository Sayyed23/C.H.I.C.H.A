
export const detectLanguageInPrompt = (prompt: string): string | undefined => {
  const promptLower = prompt.toLowerCase();
  if (promptLower.includes("in urdu") || promptLower.includes("to urdu") ||
      promptLower.includes("respond in urdu") || promptLower.includes("answer in urdu") ||
      promptLower.includes("reply in urdu") || promptLower.includes("using urdu") ||
      promptLower.includes("speak urdu") || promptLower.includes("in the urdu language") ||
      promptLower.includes("urdu language") || promptLower.includes("urdu translation")) {
    return "ur";
  } else if (promptLower.includes("in hindi") || promptLower.includes("to hindi") ||
             promptLower.includes("respond in hindi") || promptLower.includes("answer in hindi") ||
             promptLower.includes("speak hindi") || promptLower.includes("in the hindi language")) {
    return "hi";
  } else if (promptLower.includes("in marathi") || promptLower.includes("to marathi") ||
             promptLower.includes("respond in marathi") || promptLower.includes("answer in marathi") ||
             promptLower.includes("in the marathi language")) {
    return "mr";
  } else if (promptLower.includes("in sanskrit") || promptLower.includes("to sanskrit") ||
             promptLower.includes("respond in sanskrit") || promptLower.includes("answer in sanskrit") ||
             promptLower.includes("in the sanskrit language")) {
    return "sa";
  } else if (promptLower.includes("in english") || promptLower.includes("to english") ||
             promptLower.includes("respond in english") || promptLower.includes("answer in english") ||
             promptLower.includes("reply in english") || promptLower.includes("using english") ||
             promptLower.includes("speak english") || promptLower.includes("in the english language")) {
    return "en";
  } else if (promptLower.includes("in arabic") || promptLower.includes("to arabic") ||
             promptLower.includes("respond in arabic") || promptLower.includes("answer in arabic") ||
             promptLower.includes("reply in arabic") || promptLower.includes("using arabic") ||
             promptLower.includes("speak arabic") || promptLower.includes("in the arabic language") ||
             promptLower.includes("arabic language")) {
    return "ar";
  }
  return undefined;
};
