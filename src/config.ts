export const SITE = {
  website: "https://jinpan.blog/", // replace this with your deployed domain
  author: "Jin Pan",
  profile: "https://jinpan.blog/about",
  desc: "Living notes on SEO, iOS, SwiftUI, Go, and small things worth remembering.",
  title: "Jin Pan — Living Notes",
  keywords: ["SEO", "iOS", "Swift", "SwiftUI", "Go"],
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 8,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "Edit page",
    url: "https://github.com/HiPanJin/my-notes/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "zh-CN", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Shanghai", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
