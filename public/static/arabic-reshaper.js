/**
 * Arabic Text Reshaper for jsPDF
 * Handles Arabic character joining forms (initial, medial, final, isolated)
 * and right-to-left text reordering
 */
(function(global) {
  'use strict';

  // Arabic character joining forms map
  // [isolated, final, initial, medial]
  const ARABIC_FORMS = {
    '\u0621': ['\uFE80', '\uFE80', '\uFE80', '\uFE80'], // HAMZA
    '\u0622': ['\uFE81', '\uFE82', '\uFE81', '\uFE82'], // ALEF WITH MADDA
    '\u0623': ['\uFE83', '\uFE84', '\uFE83', '\uFE84'], // ALEF WITH HAMZA ABOVE
    '\u0624': ['\uFE85', '\uFE86', '\uFE85', '\uFE86'], // WAW WITH HAMZA
    '\u0625': ['\uFE87', '\uFE88', '\uFE87', '\uFE88'], // ALEF WITH HAMZA BELOW
    '\u0626': ['\uFE89', '\uFE8A', '\uFE8B', '\uFE8C'], // YEH WITH HAMZA
    '\u0627': ['\uFE8D', '\uFE8E', '\uFE8D', '\uFE8E'], // ALEF
    '\u0628': ['\uFE8F', '\uFE90', '\uFE91', '\uFE92'], // BEH
    '\u0629': ['\uFE93', '\uFE94', '\uFE93', '\uFE94'], // TEH MARBUTA
    '\u062A': ['\uFE95', '\uFE96', '\uFE97', '\uFE98'], // TEH
    '\u062B': ['\uFE99', '\uFE9A', '\uFE9B', '\uFE9C'], // THEH
    '\u062C': ['\uFE9D', '\uFE9E', '\uFE9F', '\uFEA0'], // JEEM
    '\u062D': ['\uFEA1', '\uFEA2', '\uFEA3', '\uFEA4'], // HAH
    '\u062E': ['\uFEA5', '\uFEA6', '\uFEA7', '\uFEA8'], // KHAH
    '\u062F': ['\uFEA9', '\uFEAA', '\uFEA9', '\uFEAA'], // DAL
    '\u0630': ['\uFEAB', '\uFEAC', '\uFEAB', '\uFEAC'], // THAL
    '\u0631': ['\uFEAD', '\uFEAE', '\uFEAD', '\uFEAE'], // REH
    '\u0632': ['\uFEAF', '\uFEB0', '\uFEAF', '\uFEB0'], // ZAIN
    '\u0633': ['\uFEB1', '\uFEB2', '\uFEB3', '\uFEB4'], // SEEN
    '\u0634': ['\uFEB5', '\uFEB6', '\uFEB7', '\uFEB8'], // SHEEN
    '\u0635': ['\uFEB9', '\uFEBA', '\uFEBB', '\uFEBC'], // SAD
    '\u0636': ['\uFEBD', '\uFEBE', '\uFEBF', '\uFEC0'], // DAD
    '\u0637': ['\uFEC1', '\uFEC2', '\uFEC3', '\uFEC4'], // TAH
    '\u0638': ['\uFEC5', '\uFEC6', '\uFEC7', '\uFEC8'], // ZAH
    '\u0639': ['\uFEC9', '\uFECA', '\uFECB', '\uFECC'], // AIN
    '\u063A': ['\uFECD', '\uFECE', '\uFECF', '\uFED0'], // GHAIN
    '\u0640': ['\u0640', '\u0640', '\u0640', '\u0640'], // TATWEEL
    '\u0641': ['\uFED1', '\uFED2', '\uFED3', '\uFED4'], // FEH
    '\u0642': ['\uFED5', '\uFED6', '\uFED7', '\uFED8'], // QAF
    '\u0643': ['\uFED9', '\uFEDA', '\uFEDB', '\uFEDC'], // KAF
    '\u0644': ['\uFEDD', '\uFEDE', '\uFEDF', '\uFEE0'], // LAM
    '\u0645': ['\uFEE1', '\uFEE2', '\uFEE3', '\uFEE4'], // MEEM
    '\u0646': ['\uFEE5', '\uFEE6', '\uFEE7', '\uFEE8'], // NOON
    '\u0647': ['\uFEE9', '\uFEEA', '\uFEEB', '\uFEEC'], // HEH
    '\u0648': ['\uFEED', '\uFEEE', '\uFEED', '\uFEEE'], // WAW
    '\u0649': ['\uFEEF', '\uFEF0', '\uFEEF', '\uFEF0'], // ALEF MAKSURA
    '\u064A': ['\uFEF1', '\uFEF2', '\uFEF3', '\uFEF4'], // YEH
  };

  // Characters that don't connect to the next character (right-joining only)
  const RIGHT_JOIN_ONLY = new Set([
    '\u0622', '\u0623', '\u0624', '\u0625', '\u0627', // ALEF variants
    '\u062F', '\u0630', // DAL, THAL
    '\u0631', '\u0632', // REH, ZAIN
    '\u0648', '\u0649', // WAW, ALEF MAKSURA
    '\u0621', // HAMZA
    '\u0629', // TEH MARBUTA
  ]);

  // Arabic diacritics (tashkeel)
  const TASHKEEL = new Set([
    '\u064B', '\u064C', '\u064D', '\u064E', '\u064F',
    '\u0650', '\u0651', '\u0652', '\u0653', '\u0654',
    '\u0655', '\u0656', '\u0657', '\u0658', '\u0659',
    '\u065A', '\u065B', '\u065C', '\u065D', '\u065E',
    '\u065F', '\u0670',
  ]);

  // LAM-ALEF ligatures
  const LAM_ALEF = {
    '\u0622': '\uFEF5', // LAM + ALEF WITH MADDA (isolated)
    '\u0623': '\uFEF7', // LAM + ALEF WITH HAMZA ABOVE (isolated)
    '\u0625': '\uFEF9', // LAM + ALEF WITH HAMZA BELOW (isolated)
    '\u0627': '\uFEFB', // LAM + ALEF (isolated)
  };
  const LAM_ALEF_FINAL = {
    '\u0622': '\uFEF6',
    '\u0623': '\uFEF8',
    '\u0625': '\uFEFA',
    '\u0627': '\uFEFC',
  };

  function isArabicChar(c) {
    const code = c.charCodeAt(0);
    return (code >= 0x0621 && code <= 0x064A) || code === 0x0640;
  }

  function isTashkeel(c) {
    return TASHKEEL.has(c);
  }

  function canJoinNext(c) {
    return isArabicChar(c) && !RIGHT_JOIN_ONLY.has(c);
  }

  function reshapeArabic(text) {
    if (!text) return '';
    
    // Split text into segments: Arabic words and non-Arabic parts
    let result = '';
    let i = 0;
    
    while (i < text.length) {
      if (isArabicChar(text[i]) || isTashkeel(text[i])) {
        // Collect Arabic segment
        let arabicSegment = '';
        let start = i;
        while (i < text.length && (isArabicChar(text[i]) || isTashkeel(text[i]) || text[i] === ' ')) {
          arabicSegment += text[i];
          i++;
        }
        result += reshapeArabicSegment(arabicSegment);
      } else {
        result += text[i];
        i++;
      }
    }
    
    return result;
  }

  function reshapeArabicSegment(text) {
    // Remove tashkeel for reshaping, then add back
    let chars = [];
    let tashkeelMap = {};
    let cleanIndex = 0;
    
    for (let i = 0; i < text.length; i++) {
      if (isTashkeel(text[i])) {
        if (!tashkeelMap[cleanIndex - 1]) tashkeelMap[cleanIndex - 1] = '';
        tashkeelMap[cleanIndex - 1] += text[i];
      } else {
        chars.push(text[i]);
        cleanIndex++;
      }
    }

    let output = '';
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      
      if (!isArabicChar(c)) {
        output += c;
        if (tashkeelMap[i]) output += tashkeelMap[i];
        continue;
      }

      // Check for LAM-ALEF ligature
      if (c === '\u0644' && i + 1 < chars.length && LAM_ALEF[chars[i + 1]]) {
        const prevChar = i > 0 ? chars[i - 1] : null;
        const prevJoins = prevChar && isArabicChar(prevChar) && canJoinNext(prevChar);
        
        if (prevJoins) {
          output += LAM_ALEF_FINAL[chars[i + 1]];
        } else {
          output += LAM_ALEF[chars[i + 1]];
        }
        if (tashkeelMap[i]) output += tashkeelMap[i];
        if (tashkeelMap[i + 1]) output += tashkeelMap[i + 1];
        i++; // Skip the ALEF
        continue;
      }

      const forms = ARABIC_FORMS[c];
      if (!forms) {
        output += c;
        if (tashkeelMap[i]) output += tashkeelMap[i];
        continue;
      }

      // Determine previous and next characters (skip spaces for joining check within word)
      let prevChar = null;
      for (let j = i - 1; j >= 0; j--) {
        if (chars[j] !== ' ') { prevChar = chars[j]; break; }
        else { prevChar = null; break; } // Space breaks joining
      }
      
      let nextChar = null;
      for (let j = i + 1; j < chars.length; j++) {
        if (chars[j] !== ' ') { nextChar = chars[j]; break; }
        else { nextChar = null; break; }
      }

      const prevJoins = prevChar && isArabicChar(prevChar) && canJoinNext(prevChar);
      const nextJoins = nextChar && isArabicChar(nextChar);

      let form;
      if (prevJoins && nextJoins && canJoinNext(c)) {
        form = forms[3]; // medial
      } else if (prevJoins) {
        form = forms[1]; // final
      } else if (nextJoins && canJoinNext(c)) {
        form = forms[2]; // initial
      } else {
        form = forms[0]; // isolated
      }

      output += form;
      if (tashkeelMap[i]) output += tashkeelMap[i];
    }

    return output;
  }

  function reverseRTL(text) {
    // Reverse the text for RTL display in jsPDF
    // But preserve LTR segments (numbers, Latin text)
    let segments = [];
    let current = '';
    let isCurrentRTL = null;
    
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const code = c.charCodeAt(0);
      const isRTL = (code >= 0x0600 && code <= 0x06FF) || 
                     (code >= 0xFB50 && code <= 0xFDFF) || 
                     (code >= 0xFE70 && code <= 0xFEFF);
      
      if (isCurrentRTL === null) {
        isCurrentRTL = isRTL;
      }
      
      if (isRTL !== isCurrentRTL && c !== ' ') {
        segments.push({ text: current, rtl: isCurrentRTL });
        current = '';
        isCurrentRTL = isRTL;
      }
      
      current += c;
    }
    if (current) {
      segments.push({ text: current, rtl: isCurrentRTL });
    }

    // Reverse segments order (RTL base direction)
    segments.reverse();
    
    // Reverse characters within RTL segments
    let result = '';
    for (const seg of segments) {
      if (seg.rtl) {
        result += seg.text.split('').reverse().join('');
      } else {
        result += seg.text;
      }
    }
    
    return result;
  }

  function processArabic(text) {
    // Step 1: Reshape Arabic characters (apply joining forms)
    const reshaped = reshapeArabic(text);
    // Step 2: Reverse for RTL display in jsPDF
    return reverseRTL(reshaped);
  }

  // Export
  global.ArabicReshaper = {
    reshape: reshapeArabic,
    reverse: reverseRTL,
    process: processArabic,
    isArabic: function(text) {
      return /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
    }
  };

})(typeof window !== 'undefined' ? window : this);
