/**
 * WCAG Data Module
 * Fetches official WCAG criteria from W3C and provides comparison with templates
 */
import axios from 'axios';
import logger from './logger.js';

// W3C Official WCAG 2.1 Success Criteria
// Source: https://www.w3.org/TR/WCAG21/
const OFFICIAL_WCAG_21 = {
  // Principle 1: Perceivable
  '1.1.1': {
    name: 'Non-text Content',
    level: 'A',
    principle: 'Perceivable',
    guideline: '1.1 Text Alternatives',
    description: 'All non-text content that is presented to the user has a text alternative that serves the equivalent purpose.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
    techniques: ['G94', 'G95', 'H37', 'H67', 'H86'],
  },
  '1.2.1': {
    name: 'Audio-only and Video-only (Prerecorded)',
    level: 'A',
    principle: 'Perceivable',
    guideline: '1.2 Time-based Media',
    description: 'For prerecorded audio-only and prerecorded video-only media, an alternative is provided.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/audio-only-and-video-only-prerecorded.html',
    techniques: ['G158', 'G159', 'G166'],
  },
  '1.2.2': {
    name: 'Captions (Prerecorded)',
    level: 'A',
    principle: 'Perceivable',
    guideline: '1.2 Time-based Media',
    description: 'Captions are provided for all prerecorded audio content in synchronized media.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded.html',
    techniques: ['G87', 'G93', 'H95'],
  },
  '1.2.3': {
    name: 'Audio Description or Media Alternative (Prerecorded)',
    level: 'A',
    principle: 'Perceivable',
    guideline: '1.2 Time-based Media',
    description: 'An alternative for time-based media or audio description of the prerecorded video content is provided.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/audio-description-or-media-alternative-prerecorded.html',
    techniques: ['G69', 'G78', 'G173', 'G8'],
  },
  '1.2.4': {
    name: 'Captions (Live)',
    level: 'AA',
    principle: 'Perceivable',
    guideline: '1.2 Time-based Media',
    description: 'Captions are provided for all live audio content in synchronized media.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/captions-live.html',
    techniques: ['G9', 'G93'],
  },
  '1.2.5': {
    name: 'Audio Description (Prerecorded)',
    level: 'AA',
    principle: 'Perceivable',
    guideline: '1.2 Time-based Media',
    description: 'Audio description is provided for all prerecorded video content in synchronized media.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/audio-description-prerecorded.html',
    techniques: ['G78', 'G173', 'G8'],
  },
  '1.2.6': {
    name: 'Sign Language (Prerecorded)',
    level: 'AAA',
    principle: 'Perceivable',
    guideline: '1.2 Time-based Media',
    description: 'Sign language interpretation is provided for all prerecorded audio content in synchronized media.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/sign-language-prerecorded.html',
    techniques: ['G54', 'G81'],
  },
  '1.2.7': {
    name: 'Extended Audio Description (Prerecorded)',
    level: 'AAA',
    principle: 'Perceivable',
    guideline: '1.2 Time-based Media',
    description: 'Where pauses in foreground audio are insufficient to allow audio descriptions, extended audio description is provided.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/extended-audio-description-prerecorded.html',
    techniques: ['G8'],
  },
  '1.2.8': {
    name: 'Media Alternative (Prerecorded)',
    level: 'AAA',
    principle: 'Perceivable',
    guideline: '1.2 Time-based Media',
    description: 'An alternative for time-based media is provided for all prerecorded synchronized media and all prerecorded video-only media.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/media-alternative-prerecorded.html',
    techniques: ['G69', 'G159'],
  },
  '1.2.9': {
    name: 'Audio-only (Live)',
    level: 'AAA',
    principle: 'Perceivable',
    guideline: '1.2 Time-based Media',
    description: 'An alternative for time-based media that presents equivalent information for live audio-only content is provided.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/audio-only-live.html',
    techniques: ['G151'],
  },
  '1.3.1': {
    name: 'Info and Relationships',
    level: 'A',
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    description: 'Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
    techniques: ['G115', 'G117', 'G140', 'H42', 'H48', 'H51', 'H71', 'H73', 'H85', 'H97'],
  },
  '1.3.2': {
    name: 'Meaningful Sequence',
    level: 'A',
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    description: 'When the sequence in which content is presented affects its meaning, a correct reading sequence can be programmatically determined.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/meaningful-sequence.html',
    techniques: ['G57', 'C6', 'C8'],
  },
  '1.3.3': {
    name: 'Sensory Characteristics',
    level: 'A',
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    description: 'Instructions provided for understanding and operating content do not rely solely on sensory characteristics of components.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/sensory-characteristics.html',
    techniques: ['G96'],
  },
  '1.3.4': {
    name: 'Orientation',
    level: 'AA',
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    description: 'Content does not restrict its view and operation to a single display orientation unless essential.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/orientation.html',
    techniques: ['G214'],
    wcag21: true,
  },
  '1.3.5': {
    name: 'Identify Input Purpose',
    level: 'AA',
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    description: 'The purpose of each input field collecting information about the user can be programmatically determined.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/identify-input-purpose.html',
    techniques: ['H98'],
    wcag21: true,
  },
  '1.3.6': {
    name: 'Identify Purpose',
    level: 'AAA',
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    description: 'The purpose of User Interface Components, icons, and regions can be programmatically determined.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/identify-purpose.html',
    techniques: ['ARIA11'],
    wcag21: true,
  },
  '1.4.1': {
    name: 'Use of Color',
    level: 'A',
    principle: 'Perceivable',
    guideline: '1.4 Distinguishable',
    description: 'Color is not used as the only visual means of conveying information.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html',
    techniques: ['G14', 'G111', 'G182', 'G183'],
  },
  '1.4.2': {
    name: 'Audio Control',
    level: 'A',
    principle: 'Perceivable',
    guideline: '1.4 Distinguishable',
    description: 'If any audio plays automatically for more than 3 seconds, there is a mechanism to pause or stop it.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/audio-control.html',
    techniques: ['G60', 'G170', 'G171'],
  },
  '1.4.3': {
    name: 'Contrast (Minimum)',
    level: 'AA',
    principle: 'Perceivable',
    guideline: '1.4 Distinguishable',
    description: 'The visual presentation of text and images of text has a contrast ratio of at least 4.5:1.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
    techniques: ['G18', 'G145', 'G174'],
  },
  '1.4.4': {
    name: 'Resize Text',
    level: 'AA',
    principle: 'Perceivable',
    guideline: '1.4 Distinguishable',
    description: 'Text can be resized without assistive technology up to 200 percent without loss of content or functionality.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html',
    techniques: ['G142', 'G178', 'G179', 'C12', 'C13', 'C14'],
  },
  '1.4.5': {
    name: 'Images of Text',
    level: 'AA',
    principle: 'Perceivable',
    guideline: '1.4 Distinguishable',
    description: 'If the technologies being used can achieve the visual presentation, text is used to convey information rather than images of text.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/images-of-text.html',
    techniques: ['C22', 'C30', 'G140'],
  },
  '1.4.6': {
    name: 'Contrast (Enhanced)',
    level: 'AAA',
    principle: 'Perceivable',
    guideline: '1.4 Distinguishable',
    description: 'The visual presentation of text and images of text has a contrast ratio of at least 7:1.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced.html',
    techniques: ['G17', 'G174'],
  },
  '1.4.7': {
    name: 'Low or No Background Audio',
    level: 'AAA',
    principle: 'Perceivable',
    guideline: '1.4 Distinguishable',
    description: 'For prerecorded audio-only content that contains primarily speech, background sounds are low or can be turned off.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/low-or-no-background-audio.html',
    techniques: ['G56'],
  },
  '1.4.8': {
    name: 'Visual Presentation',
    level: 'AAA',
    principle: 'Perceivable',
    guideline: '1.4 Distinguishable',
    description: 'For the visual presentation of blocks of text, a mechanism is available to achieve specific presentation requirements.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/visual-presentation.html',
    techniques: ['C19', 'C20', 'C21', 'G146', 'G148', 'G156', 'G169'],
  },
  '1.4.9': {
    name: 'Images of Text (No Exception)',
    level: 'AAA',
    principle: 'Perceivable',
    guideline: '1.4 Distinguishable',
    description: 'Images of text are only used for pure decoration or where a particular presentation of text is essential.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/images-of-text-no-exception.html',
    techniques: ['C22', 'C30', 'G140'],
  },
  '1.4.10': {
    name: 'Reflow',
    level: 'AA',
    principle: 'Perceivable',
    guideline: '1.4 Distinguishable',
    description: 'Content can be presented without loss of information or functionality, and without requiring scrolling in two dimensions.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/reflow.html',
    techniques: ['C31', 'C32', 'C33', 'C38'],
    wcag21: true,
  },
  '1.4.11': {
    name: 'Non-text Contrast',
    level: 'AA',
    principle: 'Perceivable',
    guideline: '1.4 Distinguishable',
    description: 'The visual presentation of UI components and graphical objects have a contrast ratio of at least 3:1.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html',
    techniques: ['G195', 'G207', 'G209'],
    wcag21: true,
  },
  '1.4.12': {
    name: 'Text Spacing',
    level: 'AA',
    principle: 'Perceivable',
    guideline: '1.4 Distinguishable',
    description: 'No loss of content or functionality occurs by setting line height, paragraph, letter, and word spacing.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html',
    techniques: ['C35', 'C36'],
    wcag21: true,
  },
  '1.4.13': {
    name: 'Content on Hover or Focus',
    level: 'AA',
    principle: 'Perceivable',
    guideline: '1.4 Distinguishable',
    description: 'Where hover or focus triggers additional content, that content is dismissible, hoverable, and persistent.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html',
    techniques: ['SCR39'],
    wcag21: true,
  },
  // Principle 2: Operable
  '2.1.1': {
    name: 'Keyboard',
    level: 'A',
    principle: 'Operable',
    guideline: '2.1 Keyboard Accessible',
    description: 'All functionality of the content is operable through a keyboard interface.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html',
    techniques: ['G202', 'H91', 'SCR2', 'SCR20', 'SCR35'],
  },
  '2.1.2': {
    name: 'No Keyboard Trap',
    level: 'A',
    principle: 'Operable',
    guideline: '2.1 Keyboard Accessible',
    description: 'If keyboard focus can be moved to a component using a keyboard interface, then focus can be moved away from that component.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap.html',
    techniques: ['G21'],
  },
  '2.1.3': {
    name: 'Keyboard (No Exception)',
    level: 'AAA',
    principle: 'Operable',
    guideline: '2.1 Keyboard Accessible',
    description: 'All functionality of the content is operable through a keyboard interface without requiring specific timings.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard-no-exception.html',
    techniques: ['G202'],
  },
  '2.1.4': {
    name: 'Character Key Shortcuts',
    level: 'A',
    principle: 'Operable',
    guideline: '2.1 Keyboard Accessible',
    description: 'If a keyboard shortcut uses only letter, punctuation, number, or symbol characters, then it can be turned off, remapped, or is only active on focus.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html',
    techniques: [],
    wcag21: true,
  },
  '2.2.1': {
    name: 'Timing Adjustable',
    level: 'A',
    principle: 'Operable',
    guideline: '2.2 Enough Time',
    description: 'For each time limit set by the content, the user can turn off, adjust, or extend the limit.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable.html',
    techniques: ['G133', 'G180', 'G198', 'SCR16', 'SCR33'],
  },
  '2.2.2': {
    name: 'Pause, Stop, Hide',
    level: 'A',
    principle: 'Operable',
    guideline: '2.2 Enough Time',
    description: 'For moving, blinking, scrolling, or auto-updating information, there is a mechanism to pause, stop, or hide it.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html',
    techniques: ['G4', 'G11', 'G152', 'G186', 'G187', 'SCR22', 'SCR33'],
  },
  '2.2.3': {
    name: 'No Timing',
    level: 'AAA',
    principle: 'Operable',
    guideline: '2.2 Enough Time',
    description: 'Timing is not an essential part of the event or activity presented by the content.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/no-timing.html',
    techniques: ['G5'],
  },
  '2.2.4': {
    name: 'Interruptions',
    level: 'AAA',
    principle: 'Operable',
    guideline: '2.2 Enough Time',
    description: 'Interruptions can be postponed or suppressed by the user, except for emergencies.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/interruptions.html',
    techniques: ['G75', 'G76', 'SCR14'],
  },
  '2.2.5': {
    name: 'Re-authenticating',
    level: 'AAA',
    principle: 'Operable',
    guideline: '2.2 Enough Time',
    description: 'When an authenticated session expires, the user can continue the activity without loss of data after re-authenticating.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/re-authenticating.html',
    techniques: ['G105', 'G181'],
  },
  '2.2.6': {
    name: 'Timeouts',
    level: 'AAA',
    principle: 'Operable',
    guideline: '2.2 Enough Time',
    description: 'Users are warned of the duration of any user inactivity that could cause data loss.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/timeouts.html',
    techniques: [],
    wcag21: true,
  },
  '2.3.1': {
    name: 'Three Flashes or Below Threshold',
    level: 'A',
    principle: 'Operable',
    guideline: '2.3 Seizures and Physical Reactions',
    description: 'Web pages do not contain anything that flashes more than three times in any one second period.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html',
    techniques: ['G15', 'G19', 'G176'],
  },
  '2.3.2': {
    name: 'Three Flashes',
    level: 'AAA',
    principle: 'Operable',
    guideline: '2.3 Seizures and Physical Reactions',
    description: 'Web pages do not contain anything that flashes more than three times in any one second period.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/three-flashes.html',
    techniques: ['G19'],
  },
  '2.3.3': {
    name: 'Animation from Interactions',
    level: 'AAA',
    principle: 'Operable',
    guideline: '2.3 Seizures and Physical Reactions',
    description: 'Motion animation triggered by interaction can be disabled, unless essential.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html',
    techniques: ['C39'],
    wcag21: true,
  },
  '2.4.1': {
    name: 'Bypass Blocks',
    level: 'A',
    principle: 'Operable',
    guideline: '2.4 Navigable',
    description: 'A mechanism is available to bypass blocks of content that are repeated on multiple Web pages.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html',
    techniques: ['G1', 'G123', 'G124', 'H69', 'ARIA11'],
  },
  '2.4.2': {
    name: 'Page Titled',
    level: 'A',
    principle: 'Operable',
    guideline: '2.4 Navigable',
    description: 'Web pages have titles that describe topic or purpose.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/page-titled.html',
    techniques: ['G88', 'H25'],
  },
  '2.4.3': {
    name: 'Focus Order',
    level: 'A',
    principle: 'Operable',
    guideline: '2.4 Navigable',
    description: 'If a Web page can be navigated sequentially and the navigation sequences affect meaning or operation, focusable components receive focus in an order that preserves meaning and operability.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html',
    techniques: ['G59', 'H4', 'C27', 'SCR26', 'SCR27', 'SCR37'],
  },
  '2.4.4': {
    name: 'Link Purpose (In Context)',
    level: 'A',
    principle: 'Operable',
    guideline: '2.4 Navigable',
    description: 'The purpose of each link can be determined from the link text alone or from the link text together with its programmatically determined link context.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
    techniques: ['G53', 'G91', 'H24', 'H30', 'H33', 'ARIA7', 'ARIA8'],
  },
  '2.4.5': {
    name: 'Multiple Ways',
    level: 'AA',
    principle: 'Operable',
    guideline: '2.4 Navigable',
    description: 'More than one way is available to locate a Web page within a set of Web pages.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/multiple-ways.html',
    techniques: ['G63', 'G64', 'G125', 'G126', 'G161', 'G185'],
  },
  '2.4.6': {
    name: 'Headings and Labels',
    level: 'AA',
    principle: 'Operable',
    guideline: '2.4 Navigable',
    description: 'Headings and labels describe topic or purpose.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html',
    techniques: ['G130', 'G131'],
  },
  '2.4.7': {
    name: 'Focus Visible',
    level: 'AA',
    principle: 'Operable',
    guideline: '2.4 Navigable',
    description: 'Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html',
    techniques: ['G149', 'G165', 'G195', 'C15', 'SCR31'],
  },
  '2.4.8': {
    name: 'Location',
    level: 'AAA',
    principle: 'Operable',
    guideline: '2.4 Navigable',
    description: 'Information about the user\'s location within a set of Web pages is available.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/location.html',
    techniques: ['G63', 'G65', 'G128'],
  },
  '2.4.9': {
    name: 'Link Purpose (Link Only)',
    level: 'AAA',
    principle: 'Operable',
    guideline: '2.4 Navigable',
    description: 'A mechanism is available to allow the purpose of each link to be identified from link text alone.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-link-only.html',
    techniques: ['G91', 'H30'],
  },
  '2.4.10': {
    name: 'Section Headings',
    level: 'AAA',
    principle: 'Operable',
    guideline: '2.4 Navigable',
    description: 'Section headings are used to organize the content.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/section-headings.html',
    techniques: ['G141', 'H69'],
  },
  '2.5.1': {
    name: 'Pointer Gestures',
    level: 'A',
    principle: 'Operable',
    guideline: '2.5 Input Modalities',
    description: 'All functionality that uses multipoint or path-based gestures can be operated with a single pointer without a path-based gesture.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/pointer-gestures.html',
    techniques: ['G215', 'G216'],
    wcag21: true,
  },
  '2.5.2': {
    name: 'Pointer Cancellation',
    level: 'A',
    principle: 'Operable',
    guideline: '2.5 Input Modalities',
    description: 'For functionality that can be operated using a single pointer, at least one of abort, undo, up reversal, or essential applies.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/pointer-cancellation.html',
    techniques: ['G210', 'G211', 'G212'],
    wcag21: true,
  },
  '2.5.3': {
    name: 'Label in Name',
    level: 'A',
    principle: 'Operable',
    guideline: '2.5 Input Modalities',
    description: 'For user interface components with labels that include text or images of text, the name contains the text that is presented visually.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/label-in-name.html',
    techniques: ['G208', 'G211'],
    wcag21: true,
  },
  '2.5.4': {
    name: 'Motion Actuation',
    level: 'A',
    principle: 'Operable',
    guideline: '2.5 Input Modalities',
    description: 'Functionality that can be operated by device motion or user motion can also be operated by user interface components.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/motion-actuation.html',
    techniques: ['G213'],
    wcag21: true,
  },
  '2.5.5': {
    name: 'Target Size',
    level: 'AAA',
    principle: 'Operable',
    guideline: '2.5 Input Modalities',
    description: 'The size of the target for pointer inputs is at least 44 by 44 CSS pixels.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/target-size.html',
    techniques: [],
    wcag21: true,
  },
  '2.5.6': {
    name: 'Concurrent Input Mechanisms',
    level: 'AAA',
    principle: 'Operable',
    guideline: '2.5 Input Modalities',
    description: 'Web content does not restrict use of input modalities available on a platform.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/concurrent-input-mechanisms.html',
    techniques: ['G217'],
    wcag21: true,
  },
  // Principle 3: Understandable
  '3.1.1': {
    name: 'Language of Page',
    level: 'A',
    principle: 'Understandable',
    guideline: '3.1 Readable',
    description: 'The default human language of each Web page can be programmatically determined.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html',
    techniques: ['H57'],
  },
  '3.1.2': {
    name: 'Language of Parts',
    level: 'AA',
    principle: 'Understandable',
    guideline: '3.1 Readable',
    description: 'The human language of each passage or phrase in the content can be programmatically determined.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-parts.html',
    techniques: ['H58'],
  },
  '3.1.3': {
    name: 'Unusual Words',
    level: 'AAA',
    principle: 'Understandable',
    guideline: '3.1 Readable',
    description: 'A mechanism is available for identifying specific definitions of words or phrases used in an unusual or restricted way.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/unusual-words.html',
    techniques: ['G55', 'G62', 'G101', 'G112', 'H54', 'H60'],
  },
  '3.1.4': {
    name: 'Abbreviations',
    level: 'AAA',
    principle: 'Understandable',
    guideline: '3.1 Readable',
    description: 'A mechanism for identifying the expanded form or meaning of abbreviations is available.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/abbreviations.html',
    techniques: ['G55', 'G62', 'G97', 'G102', 'H28'],
  },
  '3.1.5': {
    name: 'Reading Level',
    level: 'AAA',
    principle: 'Understandable',
    guideline: '3.1 Readable',
    description: 'When text requires reading ability more advanced than lower secondary education level, supplemental content is available.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/reading-level.html',
    techniques: ['G79', 'G86', 'G103'],
  },
  '3.1.6': {
    name: 'Pronunciation',
    level: 'AAA',
    principle: 'Understandable',
    guideline: '3.1 Readable',
    description: 'A mechanism is available for identifying specific pronunciation of words where meaning is ambiguous without knowing the pronunciation.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/pronunciation.html',
    techniques: ['G62', 'G120', 'G121', 'H62'],
  },
  '3.2.1': {
    name: 'On Focus',
    level: 'A',
    principle: 'Understandable',
    guideline: '3.2 Predictable',
    description: 'When any user interface component receives focus, it does not initiate a change of context.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/on-focus.html',
    techniques: ['G107'],
  },
  '3.2.2': {
    name: 'On Input',
    level: 'A',
    principle: 'Understandable',
    guideline: '3.2 Predictable',
    description: 'Changing the setting of any user interface component does not automatically cause a change of context unless the user has been advised beforehand.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/on-input.html',
    techniques: ['G80', 'G13', 'H32', 'H84', 'SCR19'],
  },
  '3.2.3': {
    name: 'Consistent Navigation',
    level: 'AA',
    principle: 'Understandable',
    guideline: '3.2 Predictable',
    description: 'Navigational mechanisms that are repeated on multiple Web pages occur in the same relative order each time they are repeated.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/consistent-navigation.html',
    techniques: ['G61'],
  },
  '3.2.4': {
    name: 'Consistent Identification',
    level: 'AA',
    principle: 'Understandable',
    guideline: '3.2 Predictable',
    description: 'Components that have the same functionality within a set of Web pages are identified consistently.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/consistent-identification.html',
    techniques: ['G197'],
  },
  '3.2.5': {
    name: 'Change on Request',
    level: 'AAA',
    principle: 'Understandable',
    guideline: '3.2 Predictable',
    description: 'Changes of context are initiated only by user request or a mechanism is available to turn off such changes.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/change-on-request.html',
    techniques: ['G76', 'G110', 'H76', 'H83', 'SCR24'],
  },
  '3.3.1': {
    name: 'Error Identification',
    level: 'A',
    principle: 'Understandable',
    guideline: '3.3 Input Assistance',
    description: 'If an input error is automatically detected, the item that is in error is identified and the error is described to the user in text.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/error-identification.html',
    techniques: ['G83', 'G84', 'G85', 'ARIA18', 'ARIA19', 'ARIA21', 'SCR18', 'SCR32'],
  },
  '3.3.2': {
    name: 'Labels or Instructions',
    level: 'A',
    principle: 'Understandable',
    guideline: '3.3 Input Assistance',
    description: 'Labels or instructions are provided when content requires user input.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
    techniques: ['G13', 'G89', 'G131', 'G162', 'G184', 'H44', 'H65', 'H71', 'H90', 'ARIA1', 'ARIA17'],
  },
  '3.3.3': {
    name: 'Error Suggestion',
    level: 'AA',
    principle: 'Understandable',
    guideline: '3.3 Input Assistance',
    description: 'If an input error is automatically detected and suggestions for correction are known, then the suggestions are provided to the user.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/error-suggestion.html',
    techniques: ['G83', 'G84', 'G85', 'G177', 'ARIA2', 'ARIA18', 'SCR18', 'SCR32'],
  },
  '3.3.4': {
    name: 'Error Prevention (Legal, Financial, Data)',
    level: 'AA',
    principle: 'Understandable',
    guideline: '3.3 Input Assistance',
    description: 'For Web pages that cause legal commitments or financial transactions, submissions are reversible, checked, or confirmed.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/error-prevention-legal-financial-data.html',
    techniques: ['G98', 'G99', 'G155', 'G164', 'G168'],
  },
  '3.3.5': {
    name: 'Help',
    level: 'AAA',
    principle: 'Understandable',
    guideline: '3.3 Input Assistance',
    description: 'Context-sensitive help is available.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/help.html',
    techniques: ['G71', 'G89', 'G184', 'G193'],
  },
  '3.3.6': {
    name: 'Error Prevention (All)',
    level: 'AAA',
    principle: 'Understandable',
    guideline: '3.3 Input Assistance',
    description: 'For Web pages that require the user to submit information, submissions are reversible, checked, or confirmed.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/error-prevention-all.html',
    techniques: ['G98', 'G99', 'G155', 'G164', 'G168'],
  },
  // Principle 4: Robust
  '4.1.1': {
    name: 'Parsing',
    level: 'A',
    principle: 'Robust',
    guideline: '4.1 Compatible',
    description: 'In content implemented using markup languages, elements have complete start and end tags, are nested according to their specifications, do not contain duplicate attributes, and IDs are unique.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/parsing.html',
    techniques: ['G134', 'G192', 'H74', 'H75', 'H88', 'H93', 'H94'],
    note: 'This criterion is obsolete in WCAG 2.2',
  },
  '4.1.2': {
    name: 'Name, Role, Value',
    level: 'A',
    principle: 'Robust',
    guideline: '4.1 Compatible',
    description: 'For all user interface components, the name and role can be programmatically determined; states, properties, and values can be programmatically set; and notification of changes to these items is available to user agents, including assistive technologies.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
    techniques: ['G108', 'G135', 'H64', 'H65', 'H88', 'H91', 'ARIA4', 'ARIA5', 'ARIA14', 'ARIA16'],
  },
  '4.1.3': {
    name: 'Status Messages',
    level: 'AA',
    principle: 'Robust',
    guideline: '4.1 Compatible',
    description: 'In content implemented using markup languages, status messages can be programmatically determined through role or properties such that they can be presented to the user by assistive technologies without receiving focus.',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html',
    techniques: ['ARIA19', 'ARIA22', 'ARIA23', 'G199'],
    wcag21: true,
  },
};

// Template-based guidance (practical tips from our experience)
const TEMPLATE_GUIDANCE = {
  '1.1.1': {
    bestPractices: [
      'Add alt text to images that convey information',
      'Use empty alt="" for purely decorative images',
      'Provide text alternatives for icons, charts, and diagrams',
      'Use aria-label for icon buttons',
      'For complex images, use longdesc or link to detailed description',
    ],
    codeExamples: [
      '<img src="logo.png" alt="Company Name">',
      '<img src="decoration.png" alt="">',
      '<button aria-label="Close"><svg>...</svg></button>',
      '<figure><img src="chart.png" alt="Sales chart"><figcaption>Detailed description...</figcaption></figure>',
    ],
    commonMistakes: [
      'Using filename as alt text (alt="IMG_1234.jpg")',
      'Redundant alt text (alt="Image of...")',
      'Missing alt on informative images',
      'Non-empty alt on decorative images',
    ],
  },
  '1.3.1': {
    bestPractices: [
      'Use semantic HTML elements (header, nav, main, footer, section)',
      'Use proper heading hierarchy (h1-h6)',
      'Associate form labels with inputs using for/id',
      'Use table headers (th) with scope attribute',
      'Use lists (ul/ol/dl) for list content',
    ],
    codeExamples: [
      '<label for="email">Email:</label><input id="email" type="email">',
      '<table><tr><th scope="col">Name</th><th scope="col">Age</th></tr></table>',
      '<nav aria-label="Main navigation"><ul>...</ul></nav>',
      '<fieldset><legend>Contact Information</legend>...</fieldset>',
    ],
    commonMistakes: [
      'Using divs for everything instead of semantic HTML',
      'Skipping heading levels (h1 → h3)',
      'Tables without headers for data tables',
      'Form inputs without associated labels',
    ],
  },
  '1.4.3': {
    bestPractices: [
      'Use contrast checker tools before finalizing colors',
      'Normal text needs 4.5:1 minimum contrast ratio',
      'Large text (18pt or 14pt bold) needs 3:1 minimum',
      'Ensure focus indicators have sufficient contrast',
      'Test with grayscale/high contrast modes',
    ],
    codeExamples: [
      'Good: #333333 on #ffffff (12.6:1)',
      'Minimum for normal text: 4.5:1',
      'Minimum for large text (18pt+): 3:1',
      'Use CSS custom properties for maintainable colors',
    ],
    commonMistakes: [
      'Light gray text on white background',
      'Placeholder text with poor contrast',
      'Links that only differ by color',
      'Error messages in light red',
    ],
  },
  '2.1.1': {
    bestPractices: [
      'Use native interactive elements (button, a, input)',
      'Add tabindex="0" to custom interactive elements',
      'Handle Enter and Space key events',
      'Never use tabindex > 0',
      'Test entire flow with keyboard only',
    ],
    codeExamples: [
      '<button onclick="doAction()">Click me</button>',
      '<div role="button" tabindex="0" onkeydown="handleKey(event)">Custom button</div>',
      'element.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") {...} })',
    ],
    commonMistakes: [
      'Using div/span for interactive elements',
      'Click handlers without keyboard handlers',
      'Removing tabindex from focusable elements',
      'Positive tabindex values that break tab order',
    ],
  },
  '2.4.4': {
    bestPractices: [
      'Use descriptive link text, not "click here"',
      'Link text should make sense out of context',
      'Include file type and size for downloads',
      'Use aria-label when visible text is insufficient',
    ],
    codeExamples: [
      '❌ <a href="...">Click here</a>',
      '✅ <a href="...">Download annual report (PDF, 2MB)</a>',
      '✅ <a href="..." aria-label="Read more about accessibility guidelines">Read more</a>',
    ],
    commonMistakes: [
      'Generic link text (here, click, more, read more)',
      'URLs as link text',
      'Same link text for different destinations',
    ],
  },
  '2.4.7': {
    bestPractices: [
      'Never use outline: none without providing alternative',
      'Use :focus-visible for modern browsers',
      'Ensure focus ring has good contrast (3:1 minimum)',
      'Test tab navigation through entire page',
      'Consider using both outline and box-shadow',
    ],
    codeExamples: [
      ':focus { outline: 2px solid #0066cc; outline-offset: 2px; }',
      ':focus-visible { box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.5); }',
      ':focus:not(:focus-visible) { outline: none; }',
    ],
    commonMistakes: [
      'outline: none without alternative',
      'Focus indicator with poor contrast',
      'Focus indicator hidden by overflow: hidden',
    ],
  },
  '4.1.2': {
    bestPractices: [
      'Use native HTML elements when possible',
      'Add aria-label for elements without visible text',
      'Use appropriate ARIA roles for custom components',
      'Update aria-expanded, aria-selected, etc. dynamically',
      'Test with screen readers (NVDA, VoiceOver, JAWS)',
    ],
    codeExamples: [
      '<button aria-expanded="false" aria-controls="menu">Menu</button>',
      '<div role="tablist"><button role="tab" aria-selected="true">Tab 1</button></div>',
      '<input aria-invalid="true" aria-describedby="error-msg">',
    ],
    commonMistakes: [
      'Using ARIA when HTML would suffice',
      'Forgetting to update ARIA states on interaction',
      'role="button" without tabindex and keyboard handlers',
    ],
  },
};

// Topic aliases for easier lookup
const TOPIC_ALIASES = {
  'images': ['1.1.1'],
  'alt': ['1.1.1'],
  'text alternatives': ['1.1.1'],
  'video': ['1.2.1', '1.2.2', '1.2.3', '1.2.5'],
  'audio': ['1.2.1', '1.2.2', '1.2.4'],
  'captions': ['1.2.2', '1.2.4'],
  'media': ['1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.5'],
  'structure': ['1.3.1', '1.3.2'],
  'semantic': ['1.3.1'],
  'headings': ['1.3.1', '2.4.6', '2.4.10'],
  'forms': ['1.3.1', '1.3.5', '3.3.1', '3.3.2', '3.3.3', '3.3.4'],
  'labels': ['1.3.1', '2.5.3', '3.3.2'],
  'orientation': ['1.3.4'],
  'autocomplete': ['1.3.5'],
  'color': ['1.4.1', '1.4.3', '1.4.6', '1.4.11'],
  'contrast': ['1.4.3', '1.4.6', '1.4.11'],
  'color-contrast': ['1.4.3', '1.4.6'],
  'resize': ['1.4.4', '1.4.10'],
  'text': ['1.4.4', '1.4.5', '1.4.8', '1.4.9', '1.4.12'],
  'spacing': ['1.4.12'],
  'hover': ['1.4.13'],
  'keyboard': ['2.1.1', '2.1.2', '2.1.4'],
  'focus': ['2.1.1', '2.4.3', '2.4.7'],
  'timing': ['2.2.1', '2.2.2', '2.2.6'],
  'animation': ['2.2.2', '2.3.3'],
  'flashing': ['2.3.1', '2.3.2'],
  'seizure': ['2.3.1', '2.3.2'],
  'navigation': ['2.4.1', '2.4.5', '3.2.3'],
  'skip link': ['2.4.1'],
  'title': ['2.4.2'],
  'page title': ['2.4.2'],
  'links': ['2.4.4', '2.4.9'],
  'touch': ['2.5.1', '2.5.2', '2.5.5'],
  'pointer': ['2.5.1', '2.5.2'],
  'target size': ['2.5.5'],
  'language': ['3.1.1', '3.1.2'],
  'lang': ['3.1.1', '3.1.2'],
  'predictable': ['3.2.1', '3.2.2'],
  'consistent': ['3.2.3', '3.2.4'],
  'errors': ['3.3.1', '3.3.3', '3.3.4', '3.3.6'],
  'validation': ['3.3.1', '3.3.3'],
  'aria': ['4.1.2', '4.1.3'],
  'name role value': ['4.1.2'],
  'status': ['4.1.3'],
  'live region': ['4.1.3'],
};

class WCAGDataService {
  constructor() {
    this.cache = null;
    this.cacheTime = null;
    this.cacheDuration = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Get official WCAG criteria data
   */
  getOfficialCriteria() {
    return OFFICIAL_WCAG_21;
  }

  /**
   * Get template guidance for a criterion
   */
  getTemplateGuidance(criterionId) {
    return TEMPLATE_GUIDANCE[criterionId] || null;
  }

  /**
   * Get merged data (official + template) for a criterion
   */
  getCriterion(criterionId) {
    const official = OFFICIAL_WCAG_21[criterionId];
    if (!official) return null;

    const template = TEMPLATE_GUIDANCE[criterionId];
    
    return {
      ...official,
      id: criterionId,
      bestPractices: template?.bestPractices || [],
      codeExamples: template?.codeExamples || [],
      commonMistakes: template?.commonMistakes || [],
      hasTemplateGuidance: !!template,
    };
  }

  /**
   * Search criteria by topic or keyword
   */
  searchByTopic(topic) {
    const normalizedTopic = topic.toLowerCase().trim();
    
    // Check direct criterion ID match
    if (OFFICIAL_WCAG_21[normalizedTopic] || OFFICIAL_WCAG_21[topic]) {
      return [this.getCriterion(normalizedTopic) || this.getCriterion(topic)];
    }

    // Check topic aliases
    const aliasMatch = Object.keys(TOPIC_ALIASES).find(alias => 
      normalizedTopic.includes(alias) || alias.includes(normalizedTopic)
    );
    
    if (aliasMatch) {
      return TOPIC_ALIASES[aliasMatch].map(id => this.getCriterion(id)).filter(Boolean);
    }

    // Search by name/description
    const results = [];
    for (const [id, criterion] of Object.entries(OFFICIAL_WCAG_21)) {
      if (
        criterion.name.toLowerCase().includes(normalizedTopic) ||
        criterion.description.toLowerCase().includes(normalizedTopic) ||
        criterion.guideline.toLowerCase().includes(normalizedTopic) ||
        criterion.principle.toLowerCase().includes(normalizedTopic)
      ) {
        results.push(this.getCriterion(id));
      }
    }

    return results;
  }

  /**
   * Get all criteria for a specific level
   */
  getByLevel(level) {
    const normalizedLevel = level.toUpperCase();
    const results = [];
    
    for (const [id, criterion] of Object.entries(OFFICIAL_WCAG_21)) {
      if (criterion.level === normalizedLevel) {
        results.push(this.getCriterion(id));
      }
    }
    
    return results.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Get all criteria for a principle
   */
  getByPrinciple(principle) {
    const normalizedPrinciple = principle.charAt(0).toUpperCase() + principle.slice(1).toLowerCase();
    const results = [];
    
    for (const [id, criterion] of Object.entries(OFFICIAL_WCAG_21)) {
      if (criterion.principle === normalizedPrinciple) {
        results.push(this.getCriterion(id));
      }
    }
    
    return results.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Get WCAG 2.1 new criteria only
   */
  getWCAG21NewCriteria() {
    const results = [];
    
    for (const [id, criterion] of Object.entries(OFFICIAL_WCAG_21)) {
      if (criterion.wcag21) {
        results.push(this.getCriterion(id));
      }
    }
    
    return results.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Get statistics about official vs template coverage
   */
  getCoverageStats() {
    const total = Object.keys(OFFICIAL_WCAG_21).length;
    const withTemplates = Object.keys(TEMPLATE_GUIDANCE).length;
    const byLevel = { A: 0, AA: 0, AAA: 0 };
    const byPrinciple = { Perceivable: 0, Operable: 0, Understandable: 0, Robust: 0 };
    
    for (const criterion of Object.values(OFFICIAL_WCAG_21)) {
      byLevel[criterion.level]++;
      byPrinciple[criterion.principle]++;
    }
    
    return {
      totalCriteria: total,
      withTemplateGuidance: withTemplates,
      templateCoverage: `${Math.round((withTemplates / total) * 100)}%`,
      byLevel,
      byPrinciple,
    };
  }

  /**
   * Fetch latest WCAG data from W3C (optional enhancement)
   */
  async fetchFromW3C() {
    try {
      // W3C WAI provides JSON-LD data at various endpoints
      // This is a placeholder for future enhancement
      logger.info('Fetching WCAG data from W3C...');
      
      // For now, return static data
      // In future: could fetch from https://www.w3.org/WAI/WCAG21/Techniques/
      return OFFICIAL_WCAG_21;
    } catch (error) {
      logger.warn(`Failed to fetch from W3C: ${error.message}, using static data`);
      return OFFICIAL_WCAG_21;
    }
  }
}

// Export singleton instance
const wcagDataService = new WCAGDataService();
export { wcagDataService, OFFICIAL_WCAG_21, TEMPLATE_GUIDANCE, TOPIC_ALIASES };
export default wcagDataService;
