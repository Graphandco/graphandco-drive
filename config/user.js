export const mockUser = {
   name: "Régis",
   email: "contact@graphandco.com",
   avatar: "https://graphandco.com/logo.svg",
};

/** Buckets / espaces de fichiers */
export const mockBuckets = [
   {
      name: "Régis",
      url: "/regis",
      space: "regis",
      icon: "User",
      description: "Privé · NAS Unraid",
   },
   {
      name: "6-MyK",
      url: "/sixmyk",
      space: "sixmyk",
      icon: "Lock",
      description: "Privé · NAS Unraid",
   },
   {
      name: "Public",
      url: "/public",
      space: "public",
      icon: "Globe",
      description: "Public · VPS",
   },
];

export const mockNavMain = [
   {
      title: "Tags",
      url: "/tags",
      icon: "Tags",
      items: [],
   },
   {
      title: "Récents",
      url: "/recent",
      icon: "Clock",
      items: [],
   },
   {
      title: "Sans dossier",
      url: "/orphans",
      icon: "FolderOpen",
      items: [],
   },
   {
      title: "Sans tags",
      url: "/untagged",
      icon: "Tag",
      items: [],
   },
   {
      title: "Doublons",
      url: "/duplicates",
      icon: "Copy",
      items: [],
   },
   {
      title: "Corbeille",
      url: "/trash",
      icon: "Trash2",
      items: [],
   },
];
