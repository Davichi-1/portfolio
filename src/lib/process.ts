/**
 * How the work actually runs. This one genuinely is a sequence — order carries
 * information the reader needs — so the numbering is honest here.
 */

export type ProcessStep = {
  n: string;
  title: string;
  body: string;
  /** What the client has in hand at the end of this step. */
  output: string;
};

export const processSteps: ProcessStep[] = [
  {
    n: "01",
    title: "Read the room",
    body:
      "A call, then questions. What is this actually for, who has to approve it, and what is the real deadline behind the stated one. I would rather find the constraint now than design around a version of it that isn't true.",
    output: "A written scope, a fixed price and a date",
  },
  {
    n: "02",
    title: "Find the direction",
    body:
      "References, tests, a rough. For film that's a lighting test; for identity it's three directions, not thirty; for a mix it's a rough balance on one track. You approve a direction before I spend your budget executing one.",
    output: "One approved direction, in writing",
  },
  {
    n: "03",
    title: "Make it",
    body:
      "Heads-down, with a checkpoint you don't have to chase. You see progress at agreed points instead of a silence followed by a reveal. Two rounds of revisions are in the price.",
    output: "The work, at the agreed spec",
  },
  {
    n: "04",
    title: "Hand it over properly",
    body:
      "Every file, named the way a human would name it, in the formats you'll actually need — including the ones you haven't thought of yet. Source files included. If it's software, it's deployed and documented.",
    output: "Organised files, source included, no lock-in",
  },
];
