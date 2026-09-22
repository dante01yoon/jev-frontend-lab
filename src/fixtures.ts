/** Shared, deterministic fictional data. No customer or payment records. */
export interface Stay {
  id: string;
  name: string;
  location: string;
  price: number;
  guests: number;
  rating: number;
  kind: "coast" | "cabin" | "desert" | "city";
  feature: string;
}
const stayNames = [
  "The Stillwater House",
  "Pine & Timber",
  "Casa Sol",
  "The Glasshouse",
  "Mosswood Retreat",
  "Pacific Hideaway",
  "Dune Studio",
  "The Fern Cabin",
  "Aster Loft",
  "Cove House",
  "Juniper Lodge",
  "Luna Courtyard",
  "Salt & Cedar",
  "The Lookout",
  "Morning Light",
  "Wildflower House",
  "Sequoia Studio",
  "Desert Rose",
  "The Blue Door",
  "Riverstone",
  "Sierra Cottage",
  "Tidepool Retreat",
  "Terracotta House",
  "The Observatory",
];
const locations = [
  "Big Sur, California",
  "Hudson Valley, New York",
  "Joshua Tree, California",
  "Portland, Oregon",
  "Asheville, North Carolina",
  "Mendocino, California",
];
export const STAYS: Stay[] = stayNames.map((name, i) => ({
  id: `stay-${i + 1}`,
  name,
  location: locations[i % 6],
  price:
    [185, 148, 215, 172, 128, 265, 156, 194][i % 8] + Math.floor(i / 8) * 14,
  guests: [2, 4, 2, 3, 6, 4][i % 6],
  rating: Number((4.76 + (i % 6) * 0.04).toFixed(2)),
  kind: (["coast", "cabin", "desert", "city"] as const)[i % 4],
  feature: [
    "Ocean view",
    "Private trails",
    "Desert sunsets",
    "Design collection",
    "Outdoor fireplace",
    "Walk to the beach",
  ][i % 6],
}));
export interface Product {
  id: string;
  name: string;
  category: "Sound" | "Light" | "Workspace";
  price: number;
  color: string;
  description: string;
  kind: "headphones" | "lamp" | "speaker" | "clock" | "keyboard" | "bottle";
}
export const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Form Headphones",
    category: "Sound",
    price: 189,
    color: "#c78b65",
    description: "Less noise. More you.",
    kind: "headphones",
  },
  {
    id: "p2",
    name: "Orbit Table Light",
    category: "Light",
    price: 124,
    color: "#b9c3a4",
    description: "A softer side of light.",
    kind: "lamp",
  },
  {
    id: "p3",
    name: "Mono Speaker",
    category: "Sound",
    price: 149,
    color: "#9eabc0",
    description: "Small shape. Full sound.",
    kind: "speaker",
  },
  {
    id: "p4",
    name: "Moment Clock",
    category: "Workspace",
    price: 68,
    color: "#dbb588",
    description: "Make room for a moment.",
    kind: "clock",
  },
  {
    id: "p5",
    name: "Type Mechanical",
    category: "Workspace",
    price: 159,
    color: "#bac1b7",
    description: "Find your own rhythm.",
    kind: "keyboard",
  },
  {
    id: "p6",
    name: "Everyday Vessel",
    category: "Workspace",
    price: 42,
    color: "#b48b83",
    description: "Designed to stay with you.",
    kind: "bottle",
  },
];
export interface Task {
  id: string;
  title: string;
  team: string;
  status: "Backlog" | "In progress" | "Review" | "Done";
  priority: "High" | "Medium" | "Low";
  person: string;
  color: string;
  comments: number;
}
export const TASKS: Task[] = [
  {
    id: "ORB-24",
    title: "Explore a quieter onboarding",
    team: "Design",
    status: "Backlog",
    priority: "Medium",
    person: "AK",
    color: "#e8bd9d",
    comments: 3,
  },
  {
    id: "ORB-25",
    title: "Build the component library",
    team: "Engineering",
    status: "In progress",
    priority: "High",
    person: "JM",
    color: "#b5c0de",
    comments: 8,
  },
  {
    id: "ORB-26",
    title: "Mobile navigation patterns",
    team: "Design",
    status: "Review",
    priority: "High",
    person: "SL",
    color: "#bbd0b3",
    comments: 4,
  },
  {
    id: "ORB-27",
    title: "Document the design tokens",
    team: "Design",
    status: "Done",
    priority: "Low",
    person: "AK",
    color: "#e8bd9d",
    comments: 2,
  },
  {
    id: "ORB-28",
    title: "Write release notes",
    team: "Content",
    status: "Backlog",
    priority: "Low",
    person: "MR",
    color: "#d4bae0",
    comments: 1,
  },
  {
    id: "ORB-29",
    title: "Ship the new search experience",
    team: "Engineering",
    status: "In progress",
    priority: "High",
    person: "JM",
    color: "#b5c0de",
    comments: 6,
  },
  {
    id: "ORB-30",
    title: "Accessibility walkthrough",
    team: "Design",
    status: "Review",
    priority: "Medium",
    person: "SL",
    color: "#bbd0b3",
    comments: 5,
  },
  {
    id: "ORB-31",
    title: "Gather early customer feedback",
    team: "Research",
    status: "Done",
    priority: "Medium",
    person: "MR",
    color: "#d4bae0",
    comments: 7,
  },
];
export interface Message {
  id: string;
  name: string;
  initials: string;
  color: string;
  subject: string;
  snippet: string;
  body: string;
  priority: "High" | "Normal";
  tag: string;
  time: string;
}
export const MESSAGES: Message[] = [
  {
    id: "m1",
    name: "Alex Morgan",
    initials: "AM",
    color: "#d8c1a3",
    subject: "A little help with my workspace",
    snippet: "Can I invite my whole design team?",
    body: "Hi team! We have been trying out the shared workspace and really love the new boards. Can I invite everyone on my design team at once, or should I send separate invitations? Thanks for your help!",
    priority: "High",
    tag: "Getting started",
    time: "4m",
  },
  {
    id: "m2",
    name: "Jamie Chen",
    initials: "JC",
    color: "#b8c9b4",
    subject: "Thanks for the quick fix!",
    snippet: "The new export looks beautiful.",
    body: "Just wanted to say the export is working perfectly now. The new layout looks beautiful and our team is excited to use it in the next planning meeting.",
    priority: "Normal",
    tag: "Feedback",
    time: "18m",
  },
  {
    id: "m3",
    name: "Sam Rivera",
    initials: "SR",
    color: "#bdc4de",
    subject: "Question about keyboard shortcuts",
    snippet: "Is there a shortcut to jump to a project?",
    body: "I spend most of the day moving between projects. Is there a keyboard shortcut for quickly opening a project? A command palette would be amazing.",
    priority: "Normal",
    tag: "Product question",
    time: "32m",
  },
  {
    id: "m4",
    name: "Taylor Park",
    initials: "TP",
    color: "#e4bdb7",
    subject: "My dashboard is loading slowly",
    snippet: "It happens when I switch the date range.",
    body: "The dashboard is slower than usual when I switch from a week to a month. All the data eventually appears, but I wanted to let you know in case this helps investigate.",
    priority: "High",
    tag: "Technical support",
    time: "1h",
  },
  {
    id: "m5",
    name: "Casey Lee",
    initials: "CL",
    color: "#cdbdd6",
    subject: "A suggestion for the next release",
    snippet: "We would love a compact view.",
    body: "Our team manages a lot of projects at once. A compact list with owners and due dates would make our morning reviews much easier. Happy to share more feedback!",
    priority: "Normal",
    tag: "Feature request",
    time: "2h",
  },
];
export const TRANSACTIONS = [
  {
    id: "INV-2048",
    company: "Acme Studio",
    initials: "AS",
    plan: "Team plan",
    amount: 249,
    status: "Paid",
    channel: "Direct",
  },
  {
    id: "INV-2047",
    company: "Northstar",
    initials: "NS",
    plan: "Pro plan",
    amount: 89,
    status: "Paid",
    channel: "Organic",
  },
  {
    id: "INV-2046",
    company: "Layers",
    initials: "LY",
    plan: "Team plan",
    amount: 249,
    status: "Pending",
    channel: "Referral",
  },
  {
    id: "INV-2045",
    company: "Good Things",
    initials: "GT",
    plan: "Pro plan",
    amount: 89,
    status: "Paid",
    channel: "Organic",
  },
  {
    id: "INV-2044",
    company: "Forma",
    initials: "FO",
    plan: "Team plan",
    amount: 249,
    status: "Paid",
    channel: "Direct",
  },
];
export const REVENUE = [
  22, 32, 28, 40, 35, 47, 42, 53, 45, 61, 58, 68, 63, 76, 70, 87, 80, 93, 89,
  105, 96, 116, 106, 123, 117, 132, 126, 145, 137, 154,
];
