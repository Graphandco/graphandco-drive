export const mockUser = {
  name: "Regis Daum",
  email: "regis@graphandco.com",
  avatar: "",
};

/** Buckets / espaces de fichiers */
export const mockBuckets = [
  {
    name: "Régis",
    url: "/regis",
    space: "regis",
    icon: "User",
    description: "Perso (NAS Unraid)",
  },
  {
    name: "Public",
    url: "/public",
    space: "public",
    icon: "Globe",
    description: "Fichiers publics",
  },
  {
    name: "Six-MyK",
    url: "/sixmyk",
    space: "sixmyk",
    icon: "Lock",
    description: "Stockage privé",
  },
];

export const mockNavMain = [
  {
    title: "Corbeille",
    url: "/trash",
    icon: "Trash2",
    items: [],
  },
  {
    title: "Paramètres",
    url: "/settings",
    icon: "Settings2",
    items: [
      { title: "Général", url: "/settings" },
      { title: "Stockage", url: "/settings/storage" },
    ],
  },
];
