import satori from "satori";
import { SITE } from "@/config";
import loadGoogleFonts from "../loadGoogleFont";

export default async () => {
  const host = new URL(SITE.website).hostname;
  const commandWhoami = "$ whoami";
  const sessionLabel = `session@${host}:~`;
  const descriptionLine = `> ${SITE.desc}`;
  const hostCommand = `$ echo ${host}`;
  const fontText = [
    SITE.title,
    SITE.desc,
    host,
    commandWhoami,
    sessionLabel,
    descriptionLine,
    hostCommand,
  ].join(" ");

  return satori(
    {
      type: "div",
      props: {
        style: {
          background: "#05080d",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "34px",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                inset: "52px 40px 34px 56px",
                border: "2px solid #223350",
                background: "#0a101d",
                borderRadius: "16px",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                border: "2px solid #31466f",
                background: "#0d1525",
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                width: "100%",
                height: "100%",
                color: "#dbe6ff",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      height: "68px",
                      borderBottom: "2px solid #31466f",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 26px",
                      fontSize: 24,
                      color: "#8ca3cf",
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: { display: "flex", alignItems: "center", gap: "12px" },
                          children: [
                            {
                              type: "span",
                              props: {
                                style: {
                                  width: "14px",
                                  height: "14px",
                                  borderRadius: "999px",
                                  border: "2px solid #7087b5",
                                },
                              },
                            },
                            {
                              type: "span",
                              props: {
                                style: {
                                  width: "14px",
                                  height: "14px",
                                  borderRadius: "999px",
                                  border: "2px solid #7087b5",
                                },
                              },
                            },
                            {
                              type: "span",
                              props: {
                                style: {
                                  width: "14px",
                                  height: "14px",
                                  borderRadius: "999px",
                                  border: "2px solid #7087b5",
                                },
                              },
                            },
                          ],
                        },
                      },
                      {
                        type: "span",
                        props: { children: sessionLabel },
                      },
                    ],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      padding: "34px 38px 30px 38px",
                      height: "calc(100% - 68px)",
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: { display: "flex", flexDirection: "column", gap: "18px" },
                          children: [
                            {
                              type: "p",
                              props: {
                                style: { fontSize: 25, color: "#7f95c2" },
                                children: commandWhoami,
                              },
                            },
                            {
                              type: "p",
                              props: {
                                style: {
                                  fontSize: 78,
                                  fontWeight: 700,
                                  color: "#f2f6ff",
                                  lineHeight: 1.03,
                                  maxHeight: "176px",
                                  overflow: "hidden",
                                },
                                children: SITE.title,
                              },
                            },
                            {
                              type: "p",
                              props: {
                                style: {
                                  fontSize: 30,
                                  color: "#a9bcdf",
                                  lineHeight: 1.3,
                                  maxHeight: "116px",
                                  overflow: "hidden",
                                },
                                children: descriptionLine,
                              },
                            },
                          ],
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            borderTop: "2px solid #283d64",
                            paddingTop: "18px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: 24,
                            color: "#8ca3cf",
                          },
                          children: [
                            {
                              type: "span",
                              props: { children: hostCommand },
                            },
                            {
                              type: "span",
                              props: {
                                style: { color: "#39ff6b", fontWeight: 700 },
                                children: host,
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: await loadGoogleFonts(fontText),
    }
  );
};
