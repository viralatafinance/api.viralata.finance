"use strict";

const express = require("express");
const serverless = require("serverless-http");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const router = express.Router();
const Web3 = require("web3");
const factoryAbi = require("./factory.json");
const rateLimit = require("express-rate-limit");
const { default: axios } = require("axios");
const faunadb = require("faunadb"),
  q = faunadb.query;

require("dotenv").config();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

const NETWORK_URL = process.env.NETWORK_URL_MAINNET || process.env.NETWORK_URL_DEV_MAINNET;
const NETWORK_URL_TESTNET = process.env.NETWORK_URL_TESTNET || process.env.NETWORK_URL_DEV_TESTNET;
const FAUNA_DB = process.env.FAUNA_DB;

const FACTORY_ADDR_MAINNET = "0xd7eC2C74808c1f15AdC9028E092A08D5d446b364";
const FACTORY_ADDR_TESTNET = "0xd7eC2C74808c1f15AdC9028E092A08D5d446b364";

const web3 = new Web3(NETWORK_URL);
const web3testnet = new Web3(NETWORK_URL_TESTNET);

const client = new faunadb.Client({ secret: FAUNA_DB });

const contestImages = [
  "https://lh5.googleusercontent.com/Oubb1vlkOxcIemBYjRYYPIGv0ZGr70kpdN3LExQ_6rzqjvoaUfqGEPocVkCosqw17tUOY_BQmFybAlojiKFNyyaLX-7tnLNxCv__XQ39DP9Yw7RLAmQ1zSrEOWszJ5hpr_X0ka4ovGhSjrpL",
  "https://lh3.googleusercontent.com/Gr8dvEm4tFjic9Pt4ciR1SszB4pQcjZipl1e7sWLzrdvxis9XSUoDhvSNms_kP21Kv2-_OSTsVMixq65cbkhrkl1DaRKyA0xZXjFF0807AU6jHCMvm5zmGSnHWSe73NNrHZpZXUheKsiGx4t",
  "https://lh5.googleusercontent.com/8SvMfBptDOvVVTbk99f2IZxzLmYr28psI8lEDEl0qrr1uURh_y02GfuV5tUFNrX7oePr1lgLQYIo5Qk4mKUBb01l6F6xxsvsBvnVtVzDBsOZaZF5Fu2sb-6eSwSAarwHD-iTDzwX0uguQwp7",
  "https://lh3.googleusercontent.com/EGJIYEE7XQJhoZ6ts9KNCs_JRg7Os71H9r955_Fa0fP_0rSdRUAkUKoPfCSbphwvuq5loHqjJwPdVMFaYMirqzS2I0w1ZNdeO5W1J-JfW5U1X44Uomho5t5CNJX4OC7XIS2-GCyB7vZ0PqWR",
  "https://lh5.googleusercontent.com/lWtQIpvMVKrsjEOGQVDL9Wzkj8gQRmQhTtf0N-ZmnAYSdNM5o9ZqPh2dcIHAAFb8sz3BVGcyUr6LV_wii-Z7ev30FuHWuzPOhSi_d5D9r7VdhnLaBhkXBWUvUDZaPzx7I8N7HSo4tVi8Psbg",
  "https://lh5.googleusercontent.com/AxDIhGTckNhW8I8O_Wu5vNJD_0lE88Qq4xe9CTNDNqeho2Ph2i2-NuUaC_iJ-fxr9YQEWHkzjLYvMzJKQPTA7q6Z7WoQ7gv1lAmonVhQb9Ivjfty9kJOIuNq3ub3_rv29xQeydG_NtkgocOD",
  "https://lh3.googleusercontent.com/xTu9XwVDjy-49CizY03d8DEmpWVGAWiCaCx614XBvBlHcayo0sjqs4tTg19YfuNInYpaROz6htgh2fdcrsdFx9gTBYXTGVyHx3lMuvlWjerXAYNm97dsdZUnc8UUn0Q19aKugjyIjup_7qHs",
  "https://lh6.googleusercontent.com/4xmhtC3AeP7xjzhSZYhKIPyWLuHxnH64UxRMbos0HMVzTG7jcoJVoo6khe05fpVYevcLpYosHw77gUQfjCxQTk0MiOEndKMJ4K2oU9fjhpULmBNAF1aW7gZbpnc0-cJN7tZXYRlcvOBmkaI9",
  "https://lh6.googleusercontent.com/754mULMmoZ9zADQvvOY5j_EGbzjKZw1WRYQo_lc87wtak1QPuMpo3dfLbufK9n0HkQ4zUUq36apXkp4NgTzhhdvUz-maLfzGvUllKbQ9BvizO3G5dI6iwZ98XfkJlpSEonKEnqeas-fveaT7",
  "https://lh6.googleusercontent.com/TLPjxiOkHeYydFpptc3VuDOIyMpfuN_yCDTB27coM53TPQDY9ISJ0txG8PnZd5-49LayNb45b4Dr7tHFCWUWJUeCdLAlibFPT0Heo0F1fql7zr2OHXJrwucogDBxl98itsqy1D8LTeWBKukj",
  "https://lh6.googleusercontent.com/UpNNQeY5a_8jDExsVkAvYI5Xp49OgSNnUcZvVdhg4ikKx-_uo7XdGyym6EGPEpRVMziiuCF7Mby5u7-Ku_dfqzEoBWVi6iPSI5bBLH-dg3NAC5IzdQi0QtQipAHci3X6aqWTq2RWs4k5kbsC",
  "https://lh3.googleusercontent.com/kDvV4YpPZuRf8SSEdav5PXjjbIU5Jn9dgntXZqFNu0FhqIOsR9jpcMZVrolVyrrVVA6jhRnSwflg73OjTi7mWnvB4k0TOiHkl4at5E3pbXS_HJgIMN4_RNsnkjb44_bk8-BqFUjeTZQyL2LR",
  "https://lh4.googleusercontent.com/LjHQ0TroK8HavnvpczZ5CySQSmjJdlWW03WxQHAWfOmnlZiEqHs9RIZ-8UNnOWkOY8kresGQ03WZQfVXRBvahH7vTO2ccY9Hhre4ZKSC2voBeroFUQaHISTxRqjnA0hz72pBDC0nviwMggW9",
  "https://lh3.googleusercontent.com/XiPPoGRA7V_Hu304ADju5RuPGmmCauD264lIQpYNAbmOkmnGtKxLuAKFfBz2zQuNZtjoozYtEAPU5mmE19utw-5shlOECDcl-nlNjaCVqAo3jsmJCsbZsxtQXUdKnyxc6k9Qwn7ocJu0K-_M",
  "https://lh5.googleusercontent.com/ySv7o8S4oDTEOl9ld9PWsxkNVogzE0IVPCy-dkOzlZ0ekv5om3dB1IlO7_AKMjy3uMHqIB7REOr3QhudZ0cNByTWt0x7-fauH84vuYjsaNvjwMF52wfzdR5qecEWf-SSgC4SVfLB9ewWWi2T",
  "https://lh6.googleusercontent.com/6j2ifEd1xlBGNxprBTzPyBN85gLN1XDrNBPNYepzTEE80kk7ma38UNClrVvFRTTTlc0zxXr1sc2CQ_H4ceHLwPJvHrtheyKpLSwgTvdPgZPnl1jCIRWAnCc0uvVJLEVQW2Iq6yhAghihi1hO",
  "https://lh4.googleusercontent.com/Jc9ASzNYa5V8DdwO-gdO694TkAOKz6cB9aRTCNvuL9ZMMElhfvct4acHG5wO_0rsPWp_WDkT1EhEo64UWPJnY5Kgc84DN6u4tHLte_bCf52lvm_vIeRI9AOmrOUylrkuep7_1tEZ3xU1uv6f",
  "https://lh6.googleusercontent.com/gJIbGzZvpwkO8O4mwJ60YCUhhyfWruDWP3rZR7KLq0mrX_83kVUAFQqBW9x5Nb8vaU9CdFaZvMBSClU2ZMi08HS7ah0z39c4lp1KvSpqtuENy1R8OUp7ZX4oCSmxNPvNxuk9RURf1l_-ZjN4",
  "https://lh4.googleusercontent.com/pyCNN1_ABmGtRQAowAVrOJt2Y5jorvKPqexo80jQu8FfPOoHW6-5-gIwjrgsk_Ln_ylablbzg7hKUPcF1NmNUvOMg7V-I5ciSmNQgim03VOGMszh-R4zeS_-5hXz4BeKaXM2ZO1SP32C__1s",
  "https://lh4.googleusercontent.com/sw8uJRqMbTdeEUqzDnUg9TyqazBQjodMRqP_ZlGgGwnjmiD3dL7HRti4D_n7DTYLFhlLLXzL-B9MHNxvc63vRErvcJAatayONdehZdSQT-vGLgifke2aUuYjnDcqzHixK2Cwh5H1XqGvR6Gw",
  "https://lh5.googleusercontent.com/17OBvz3YQEqoDYjAECEkwJUzJvbJiqg9kbS7t6SwWAzMk-5tXvVMJiAFJT5qwFV__SuW7723F5e1PCwUivhO7EzYdATcCszF9e9Uq8g6lkrvQUuVyZEu9LIt9RgbEEl7Ma55aLp9A-ivLLQB",
  "https://lh5.googleusercontent.com/ZKTZK08Pf6R6IwaYEfkdZrx2cpRJas9y9w2rI-4NUIVHBO2jAi2ln1XLSdhCCs11ffX8BzLXPAOYvOUXcg_1QB0Pi5YKmAu95x8HRX9thA1nlxvbvzmbuul1-ejfsAgOljbKNpD2Bj_0BrvA",
  "https://lh3.googleusercontent.com/ypyKMIhC3lKZi_TiiqrhyWROGmas_WHHs1PmOSInnc8ZkPf3qdcFwv_MF9u21OmgUu8t3HWMTrRc6-2nfcnaN7oWhAyYUR8KtzZJMNpYufo8f8j4FTT4vFVzUsFPlK_UgFCfeffe-UAH12Ib",
  "https://lh3.googleusercontent.com/HYkYeWudGe9qRfVOHswe-YYMg9YHyQTYzvEMb8Ry1nL990s-2HDumDbssgGIwKhv5dUtrc_xeFH28LvS8T3N_cpzO95sCnPv7cMy_bjge3bIkB4X9LZm-vcjNUPEj7IsL_q_rUz32Jp2J13n",
  "https://lh6.googleusercontent.com/Xy7nGUIq6QcAx_aXc53Y8EjoikB0gDcLG8Sp-11-vSAX-5gyEbyEWmQ-JZBFlYoAjc8z4SNEN7Bw4TRzO_Gqxa91wX0N08yQdV6ps7_sgJrhocN9FzT9s77jM0Qf_zIqAkoKfmZvdkmD4Bs0",
  "https://lh3.googleusercontent.com/AlkkSkmr3Li0d_TUG2B7fGxUe2xXfvnrSdnufxQjI9zszV12ukKZT41TQVD9VtTLE1bmYEcU2mHiz8fjadSKHdjs-Doa4uNxQYHDSHxbxrWPsIfr10JHaNsWcTf4GXxJ1jJrkrfLzV_Z2_qf",
  "https://lh4.googleusercontent.com/97DDswr7QuzMeiC-1fn4ROh0ij0VfmT4IzlPU2GU5nfM45gtxDcVyxta6q4xpWqxL_pl08ULIH7jj90ju4KHr0g5woDsrUtI8d-jqGCTep0HW9QsoerxyZ3gavkONkX62YDbUbv4MYPTsdnP",
  "https://lh6.googleusercontent.com/lXVDwjhXX5QaiobOTDkCLEH8Eva2jzkMQ40jBJnNxjBsQ_vBuHkyEqbSOfII0_HYjvH2H9S7N7jy-DMse5_C7xFLpMoo2lv3y0dLw3wgX8iYpFwYOEhEvXMv8nHv4MNK7UdNpN3oG-Q7wsi5",
  "https://lh5.googleusercontent.com/s9vnSvvjaCbs2ryqabiMXtOx2kmpq7AKN7qHtZFLBpbodjncyildBzEP6v-X8cSBZS1_fKX98hZWZp3jJq2l9Z46AuN7YBIsO6AavzLlN_rzRY6-BFzAwexTuJYProBztarcoTGXLDZ-zIaT",
  "https://lh5.googleusercontent.com/k9szxsOuNWXbii6UqcgcVRosckcQ7y6ejD1-rEGtm1DW0FYUu2AKPWjlH-s5ojiOLsCHgVb-EWPHQ_VgnlgrjLciQOEhhFOQkA5R-p-_u6qDD8oe7ZZGeU1LYrAaJfF0cUJMhqE26QmU1hbm",
  "https://lh3.googleusercontent.com/MDlLtKV8otGSHvQr_APnjKiWbcuNalwX3Ou1OBSkjx6pafI_OZVE0T6pJZZdmibf3YBLbAvE1So_01_rcNaZQxFQyvJjiMZNM8Ns1xTwhBuCPOsURJjwDEF6ASsElk7yRWxxdN9x2zrj9Anz",
  "https://lh5.googleusercontent.com/s3R1XZIOrtAcL4sFqvdduTAEH16_QayOlqxI8Qzo6qQ5yvQPWS1-YP3NsuDGyfeHujuWxRj4EIpvsej51PFGvRrbKTmUCjfk3QSjeydSjB1WuO3vJm3B548fFUAcO_PpWH7zppT0rmG59D6N",
  "https://lh5.googleusercontent.com/XHAeJoqusoXlAbIxK0MGab-uWOCOnDcvszd3o90z60NOkkVWox9wDEaa5vOKFtFcVqbpMHwBh9aNlp5KPywoXEouyxsV05pAd7CvbVzLzurO5OK70k7SRXO-xzg_Hqe41mF3EsuMYbQL_ixY",
  "https://lh4.googleusercontent.com/HT3nmRwsVS63b6HbjvCGSJ7LBBUiwhcbmRZZEv8us4IzooRAzJLPXeTiBgM4EuhEClpcCHgsHGOGZZzTs-tsJEqqITcQCnFt3tThRGIDj-8VU7lGRq0iXjTCpqHErAN0ZJl94DvZGQPA292Y",
  "https://lh4.googleusercontent.com/D06GYVe2ZNdjFGTtJN7nyu7DrNc1w5MS-0IpB4FJJynas9cxuJZ_7-eJp2SRtXt_30eQMQ-YM_82aOVGB0aldu23LzeP7m4CbycOH4pS3XXFQai7bhz15RcfcA1YVqstApWWD7EULH8cyjNY",
  "https://lh6.googleusercontent.com/28LT-inr48UAccq3zfIVfAgAL-qzlJpV4YSlA9JA0ZscT5V4725vZl66oZHl1q7rP5ODQCZAHIg7QXbmuGurXx1-Lj2ZzkuF8i1pvPOGYY48y8KWAcWbBrk2znAQKoj0xOSYJq72iirEFWSM",
  "https://lh5.googleusercontent.com/76DGQ4NYoKznqQY17ancAzTgxKYvG7tk7ATESDslgnMeYJfKG1A1oyRzcqzIgGSC-38r2UGBB6wPrrgKmj4e5Nj2fbfkMnwf4FfoyP00bMdaV1ef5yfHEk3PtdlkMCex6yqCcO4trXEoasT7",
  "https://lh6.googleusercontent.com/6l7IuX446jkmjPDff2PSaq-dZ9d46tfMLT-kiuMH7zjoOoSJWZRqFOegwTgyEW41Ve7lofJNaYx-cKaa4NqRnojPGd9Fee5UFvMtw-Vk5BFTlQfbBh6QPHig5fdYTZp1_HWMRuoeRgTI29o7",
  "https://lh5.googleusercontent.com/1gV_el2awrwUU2Ju4rF4W8X_WD3dZrnmIvlz0ZLMSJL5JSmJwPJjQXatAloSWWvzD6yZadYTnsEU0-aww6oQqcy3-DI5FTtuoBhSDC0T0DeZQHHu2YKo43uFA-EjHNoZ40iCV1IuFbHGacIt",
  "https://lh5.googleusercontent.com/fdCpNaWJQqzRPotdE4mDMadbwjjQZAz2WFc_UQkK3eULFEfgHBKCQ0H-wzleKX03ZgUJ1rJMbqZ3Ct8mHCAsNxRqlFAchyUMeyDX_euYE3lUzzdl6Y-p2zmHvYMy7p-k7sTGBk-SN_UfIi1S",
  "https://lh3.googleusercontent.com/ID_GsnD5yw42KYSIYB3fGfApfLM_GF7rZnaTOklrRinYa2BYsXWeAf40TgF76hzJZlYtiPgapCqmEwFpqh-e8O-AmK_hFqmPxF1qbQOktrZ96Yx-FTXmqNnpZmopjjR7vnnMljM3GS2y1CGl",
  "https://lh5.googleusercontent.com/oZPfj3fibH6f2KY-QjR4RhNmBQJ_YpUvFh6hVNodpwFhzP2RufYs7I5Pfl-hVSD65h19WHe1Q99pVva-DXCyMQc6FLnQf71Xt5wtuHr-uEZ1IERiPFRwmHIc-fQKw_FcvB9uxXPDFStmsZ7Z",
  "https://lh4.googleusercontent.com/vNL0NypHiPlYC0X1fCEpfbU3ys4gAjwKOamvqOwxJMJT3aOVLQibyu8E50gahI70TSM07zR5OZxQv94WktCBITWMMehXKRKsRMn-OOuYzUxtc9pJqv5rofsqXX6LJxhBqaIyMxSK5xCfNAWb",
  "https://lh3.googleusercontent.com/0mkAzB67Nf0bpgW2oKpkTzeI4pKUzAt594wwCAcrQ6AvJN1d5sJyEVEDagzRuLx1UiqMufMzzNWsnyJVCEfUrBIUFsffxRBeXVN0H_jGbwNCUh3NtHwGIccGG2We46qP4T90dMD18CYsQK-k",
  "https://lh6.googleusercontent.com/3Ob7gHnMsASX_nAAX7cGMrGhQXqARUsucJKghMVFS6P-I05uhPoDTMyMaJyAqYb_f5X-aaHYmXyofdvzB1wNN4XE4s1QZ1ryMWsqXBFdhhpSoy5ORq2d-F0oYfoliZtxyv57up6LMljObFTW",
  "https://lh4.googleusercontent.com/2-eXoJbg4CbSiZiKu4q2oUvnZd4bqjUMHvOKHqtLxND5b8nOQM-ikCexFquly86cIL8R1vBldbtTYyJ8ynv2eSS3_i3szZqm5RcHniEMKASp4KOFgJp8G2UVKjKF2aJIyuPpE4A9zV8Dl2-w",
  "https://lh5.googleusercontent.com/qzaby8fEJCj1-7JayDbCw85jJREjJr8qjzUwPWrf2MN1uiWcCZ_U_j4qRviDW1M_bnuWk1xNMr5n2fgRPfhi733u0ZMBGh5Z6i9ODQqAyCPTRUdj0Ko1HjBJzxXSBWsJUI5cmlVsJI5aq_ZR",
  "https://lh5.googleusercontent.com/Rm3erJyqwzeaESTV_DhwBXIix1L607gIkP0kIVm0IIgwICWYV6shxy4ZvjIfl5-zmknzZBxVTC3Ijt0O7ctNYHKYZ2Z0nYcee0es7vmKaanjSsdNtNXkscBaz7YNiiWsNNEWlnwc1d29M46r",
  "https://lh4.googleusercontent.com/pN2p6EUl-VMS35XifvPhLPIpsfvJkU8SPO5BqELkk1C3IXvfiQVaTPCGtYL5KvY4wRniLbwbqxUPcCougfiUV0MK20l6WTLHr5mJW4YvACzXqjJfI0UWFb0ppFD04AFDl-OSq8W6rSb1a2K8",
  "https://lh4.googleusercontent.com/ki3Ie4NjvcvIkn2vnJVY5oKr0YjxcKlglFJer6nFiDO5Z5d4SPzyaxC6EuwcbS1Li8i645aLEFcBXJh3vI5J2nFB5gCSIMQMyIhVIJYtj2PTYMKDBzUXpEWdtrAxoCslVIdXnW1NyshXMrY8",
  "https://lh5.googleusercontent.com/WC2CiWE6LpfPMHdyaxDZTNobbk7XDs1WVO5aVALRhiuaJMhQUR7I28HmimzIGF_steIms1mUJdPh5sJQLu-7bT3Qwyp7GQUhlGUvceTEk5JGfcZhbbXJPGbne5ioCzQ9cAq7ctjn4BBPU0pQ",
  "https://lh3.googleusercontent.com/FKaKQnT8CLBT9y8bubXrpviW0RN8wD1TjSUMUaHU2BzWTeSE6TTe-ppdarjeRBSp2m3EV1HzMGig5z0WHLsxJQshzx2TZhetVB8L7XhFLdeMgqtD94ji0JkUTeSEsEWIopx-vGqWgb_rSjVn",
  "https://lh3.googleusercontent.com/U_lYmWg63x1jXBLvN_QlgGiXj8Vw0RgVsFdmDUDgmQ1fY9pNyakD0LrFWFLkDtVVVDR9HZRGiSU62KEfRlRkFFi0jqGz3UbGt7ksrci-cex0Jt8WBxENV00uEAzNVbHcw-WdMqrkAjGBfgFR",
  "https://lh4.googleusercontent.com/DtMo4L9V0Ptz94VjGh_wi-fJAU-4nTOSUBm5DGnRv8B1vSm-uauKG1q9wFiPQ0k1zsnrHbpqUVuLeJOc-nUEQA66DbvAkQzRh7dZHy2b0vzpcaoJodqUgBQHa6Kf6tQHCtsxqaxiQp0tuCGA",
  "https://lh6.googleusercontent.com/J3tAdquwikp2o2m3GHSU8FZQAgXj6Jr84pP23wgF07Y1H8B9cBg-rlEjmDYc0oSc-nLsH0fXKpOat80co61ypud-1JcbjZHz29g1xcBZ0Ha8cTbPHD6XsAFPJg7-BsBmQ9h6ShhI4ni_uUNZ",
  "https://lh6.googleusercontent.com/vP7E_A4r1GQU7xaaDe1azxwb273uky5NPsKcUMSAPXmAdvc6Q4tIJPDmtppO79Zd0u1Ul1rBiHyBRWv8oMsoUb3GRWcdMRw7GfdJRRPZKGp4N9BDGnc8EOpLvoQY3cqV4GiOQkg3syhS58Ie",
  "https://lh4.googleusercontent.com/r8Fb97UEB32-jTEEEjy7AfnDr8yWdqIXdj-k9nqELhu3CWLOiudlOk_LOah2j17RlvJoKDWzZlEoJnRu7IkVvNB5l375fJVmQv7tGZOGUGW-pmM-0txnnIjMv4EajrJkF4u8bzPytreIwePu",
  "https://lh5.googleusercontent.com/fBDkojZ3tugYiPngOPA3i6KLjX5XpIKbdLYxG1u23ObTUnGDHU6eQ5JSZHZNT_dUOsslkFK2P_1n9xYKULhcxqkM2LGWdHyKUV-z1CqEt7LZtQigNFyhIUiQ7VyUZ2CVaeBzgXwwNI-9t0oH",
  "https://lh3.googleusercontent.com/pjAnRjtD3bCD9RoGI_jfp8W1LWZloNohckAivKVjE15QaoOhiZ9vqjfmGQN96gXKnEo3U6k4wyAtHBLwOVCZMa7p6CQlGZwFkvLILaL5ll4wYCsoLphXsvcOH-b7yTGIN1kB73g3T3EsQ-P5",
  "https://lh5.googleusercontent.com/RkAIAYFFgfyDDRHI7qGR9MluBSWMRekqG9r6VbDIeo-2a8PrQ056w462o3AeUnmy79njXPX7yKMsvET0PtpjTdFZ666RDgzIAHv0RWOVe5W75oLp5OSq4t2rkYnSUtnpaXQlOoxABU7KS1SC",
  "https://lh3.googleusercontent.com/2TGtKOtJ32p26yspLjRVgmRiO7vbUJ9KFtIsmB1_iJmfJlqqVBGnBjCNNQARoMTOoy4BqIOaoWoR3leUingS8z6Rw-qlDsUKh0Wf33WZiPn4GfaGdAN7VCk493A6c1qr11BPxGJW2AJZmh-G",
  "https://lh3.googleusercontent.com/HCIl8fY58HSgZEd35rgmNHji2pFh8xZde_24R9iFyR99CxFBA7snnHCWLVWtZ5iEvV_LGhTOm4gbMQWTitcJx80gEEMBIezuZW83ZvGqF-lWSz4BUvf18P4jXNR4Z45XH_YwlhznK4oEO95j",
  "https://lh4.googleusercontent.com/weffo6nHf-j8stAyMTu1jNdb7vXaM6Y8bVhSBxgySrh8rvUlKBn8uZmXRGV5LxT2VeQo6VqGGXMgcaPbasFybW95UVZ3m0lw-53eKOTVCE4oMRYE7GJKxQEkbBVT936pGqomSYUcO3sVhP64",
  "https://lh5.googleusercontent.com/jNRn3b88VPWZDY68VHeRhUEfmy_zbn6st15ONdLf5vzr0vPB8FWucrILkkRy5V_V0ChPgB6imlMWzU8avKsppZ1DRjso_6YlPzX9b1rEQ-WnTv7mXOaqq0y4j_dbqLrUNQGSgVu87LXiyZF1",
  "https://lh5.googleusercontent.com/SlNAmG-4sgw45RhZfM_cjvC7omN7XJFwfZBBkpUK5jcqKebtYBqgAjpjU7l71zF_SET96RDvEPedUCCDaF5Xe-BH0UzLiV_Gc2oXgtXoWb-0s-ORo0Rh8PClHgu2SnhuCetmYPD37k1ofmnq",
  "https://lh6.googleusercontent.com/APLSwpm52hUveuz2MAZjkdLduGYqUHvpal4JZojqZ87qFHEvcyQHO0CRtGSMPunjkhWzy26BI9RH_dxBQdpJ0qSCISElShQAjGAVmwT5UcY4zlyWJk73-Ux-HQpkhyvhrH1FpiBAcCAXRCEi",
  "https://lh6.googleusercontent.com/SmAHtIZKKOCOcej6gjsZnwp-ikoGfL6_8fMpRJnZ25tRCrYCsjfIsB6OCbZsgIZydfRCj68qb-NzYp82_2eM_JyH2eCbT4NjdDGHrFncxSDMEIAUE5PHSva8NZtitvHG-XXvsRRZ7fBXb0eN",
  "https://lh6.googleusercontent.com/4X_J4oMeQh5KuHoCmJGo-NOV_QAb-vFTuV32w3gN7ONBHU6rQAe9ptrgux5GlN-V6FaiDTmPASB-NRM9X6-A2OMBq8uApLB98qDBOICGou4fqngyf2M3WUA-NYQIw8g96pb5hKUgYngWNA-6",
  "https://lh4.googleusercontent.com/RahL_wuzyrjnok2zSkZYzeXo5lqdrRdDLi64V8t5P89WUSxYWvi6ur5Nwa_ZXWV3VC7KJ9F02Y7htm8o1Mvm5NWcoLS0jXnz4HZ9sZP9w-ZP9n_552QcqEVvzp3tBl6kyXqSC7j_l__j7nIq",
  "https://lh3.googleusercontent.com/-qgCXtX3O-c-cfkGO6ska_mfUrD1YvzXjKQu8FpwTete-RgYtu0lYOYT_pekyOzqzIBdG2aUaemmC8B0FkwUFdjx0TyuoKklpbaLvu2Gn3shulnsc3hosJbE3DnK_7cTtOMby2xMo74V5MLT",
  "https://lh6.googleusercontent.com/kRm5XsfvJxvnxTzCgNLtxmrqvtMGukyU72_qWRCIOzm7XJ0OjCed3R90yqu0hb-YMFwhuRPnMOuCoq_A3TPgql6cE3Rekci9Rdjff3LrjVbJ2JI4CXcw_Lj33hTthgLqhSOU_QcOWxuLbCTI",
  "https://lh6.googleusercontent.com/DKbne85u4aAwOdmF2xxzk7Opd0ya1IT6wASolg4FnZtbNjciKIV4JSqTjTV2i2suGQTRRLiT9ZpHMrluj4zbU3Z0ZLELWZYWvdxWI3kSBurUY5_1IoB9i-hzC9XFTqBcHi6smlbpm6Rb94-t",
  "https://lh6.googleusercontent.com/fpLKUAQX4KYN-9ah5APyw0trvDS2xNpplhVYht1A-ssWLnuddUNgxWSiMJ0wXe0tjxemBvOOKS4nCGHAL8Dx9gkTEGoIEwQn4iwrYdzJjureL88_x8Zq19QOVNk4V9cLDH0VlQQosUUKcSvn",
  "https://lh3.googleusercontent.com/1QnK2HxKYeVPrleK5Yiijoo80WIo1cjKx6RVEQ-hz0Ek3Fgtrz_OoTOfVTqc7JqbkmSNY7fdATDmOEv0we1IqgW5IkGpNRY5BD0qaOmNvldEnjMmZ3kt64Lafg837eMAFmcIkqKz7sWRu-61",
  "https://lh6.googleusercontent.com/UFI3TQ3mcGepIhdxmHCQu-ye2rkR48XJizPpEr6CATxtrQOjGU-pepTaXQthRlTCRCXtKrOEmS4msCPz-QUTe1OiUjuV6T2WiO-_tzAUn2QHjPBpXhdLVLbdAp8azF9d00sOwZQ0ir-YUuhB",
  "https://lh3.googleusercontent.com/ZhM1ZP4vpiMdQQKl5gVK0ts65537dGlbbvZ-0kgTCyP_TkPfOxsGjxmYufvQOIG1R5aCinNUu0RJT9zfzOXtc2Be4B6gOsslXJnZG8GKIBRNkdpO2t8Fe9xT3pNDaPTCjlPgmfvd9F7xOYsn",
  "https://lh3.googleusercontent.com/duEvazoHJ6Oy3qgo83L3oRvMhRmU0tFnXoOXtVXwTXgLrghn8XjhL4lOSVmnmr0O7W3SE59OC6QYfzeHS_P5dazaQ2zijx5WhIurZjkDIjp8E7ccF8FkCat6FfbGFhnQ7YuEuNnHQGSTuRvx",
  "https://lh3.googleusercontent.com/ccq2fAxwegnHBCSpUO0RYj2hajXWw4_GL7riUZbe4qZ2yRWR2gd9TtaOrO7DRqiELy8R0NhN6KO3BX_mVZkRqpZ7HcujerceOYRY38SIfrkOdvhRjjkj8n4DfvKaODvujHZbWz8chlFUJfcN",
  "https://lh6.googleusercontent.com/Il3Umj1fEE6WCzn5oWOzlDSjP-YvHyGyacqaBn_oNsILxj5em_OZkyw8EneSPEV8GSsYR4Poectvzj3H2_n6WA9E3CDKj1KW89nhgFyjsjBKNcfwyscZn6k7bFcbYsubD5l3jJBN2gzzo1Ll",
  "https://lh6.googleusercontent.com/wJ44gYLuyeD09ZDDu-XcCdgoW7S-MRm-YTAblW2Njnk7B_dOr9oUowSyrb_w18q0brsfoMHBuWzMFqEcsTkeYzVxGesVGI1d7DgpVM0NxLIte3cYkBdhPK91HIWFg5h4OFnynj67hdHRyGWY",
  "https://lh3.googleusercontent.com/x-GN30OZIm5u7-kX9qbArLPzb-l0Vea_2mWYdmehsrOtYSvwY3L201nI_E1rFl3iaK1Cwn6DHoqUlACgjD9CjFzCjkBCLBqRV8wDoUr5cA4IOCB7XasKuVa-ZLaDL4V2ujaCg7IE1kGu2RLa",
  "https://lh5.googleusercontent.com/Wt7UFcKC0rwk1-iPlb4I79Y54YxMPW_hq88EOrWgKzVtTL2UWaQ9rSFYwZhv_UdCnL-1R-663hO7Y5IJfyvDPtgsekOelnInOj9Y1xrWKSVf_CKFIFMI_h25OVg2SI6rEGVMS2qSpwUgDn6P",
  "https://lh4.googleusercontent.com/Dq846fANslosTRJlOmBya56KXWBFdHphaR92HaM0eSbqbrmbXAjozWzN2aZthYxUAEe7NHKIZ8im5EEHU4ZmLfQHOB749TgM7k-ir_GMMAQF7McSzplH6K40--rSBrd6dTGmbM_g3cCiOr3g",
  "https://lh6.googleusercontent.com/9eYAzpkB8rukvIzLK1LInw7F41ndRxfD0094WciX-dQSAA8wuuf_ZWrPhZIBS_Ds0xAZkRzYYU0xtMRgYYNh4GPbmyO3moa2MpVVxv60HKxyYJo2_t4cilnS8xzJG_GOuHU_jR87IQ7sMeN2",
  "https://lh4.googleusercontent.com/pEqdgsJaksO6cB4oeCnv9w74jOU96QTOz4JbLrLzmO6S0Lpx-HVGJklunJ4hmIBCTrJrmL7iqS9SxszNvmvj-Tg9A2q1ydY7m0w21FEc8GOEwsVbAuOV1xaZl3hIUuynHq1Xsb-0KuiwdgcK",
  "https://lh3.googleusercontent.com/bOKy5Z4qnxcLLeswHvBZxeVIcoZNwFTh3E7UIsIyth6OnKnMHrsXMtqKGZ6gDfpuKmpOSTBf_0weLTlrlVwG4SM8t9JYBSO_XKkqySp86lBTqACRcApOSAHhU-zAV1bZ3YOYnc6TcZnpPKzg",
  "https://lh4.googleusercontent.com/It4fVlgb7V6fNmWcgpnJJUH4ufifNUnh_vUYjXgFcOxBL_5cnwNpNI6wSP0AEPheD5A4iiB90yNjOrlBRn2Z5aKXq7SHoahqk7XH8faatdoxtz9kXyD-jHQ1YQ1FbgNbQqimjeDqaSlRRR7q",
  "https://lh5.googleusercontent.com/QfkajPwZzKpJXsmKxzv3wesnUUC7G4uKQcSjz781i-9WQjptiwv3k4v9GFknD-XirOVwGd6TT85r3NQybQ8rB1FfWa15Tsys_hgBJGQlaBvFTSlr1v_PuR3TXFrzRI7A-vZ7eWlpbdYmF16V",
  "https://lh5.googleusercontent.com/4Zpgw7VKXlkVlJbQYfbvfg64jGr1GtkPkH_HfCPNqKORf6jQumpZcaqRYe_2QN3BHnUP-HOJcbAplgcE2uDhYGajUljtnuFULpuYhF9axUNiwpepQ_gMdkm38CJMT0APFra_la2sIcBgPUGI",
  "https://lh4.googleusercontent.com/Ii9NMDlusMDY0ElOP8dHMLY6lZ80Xx8MVVXOzSuwXL4grpLBgBLKjv0eizYqDDjHaX3A5OTRX8_C-8tYB0AdjseBdDW4qKb8WzomRVqCJIB5IQ__k8WByhetFanPtYtdx4_-ENtYqW1hio-9",
  "https://lh4.googleusercontent.com/zcyeHBD1OePT70wWddaIEwHDBWuFot7NQJF5WjCxGB-KHSFg59g-g6D2qpIaMSKR0Hsl3X93bgMKLiiRraMssbEZ_eDxO83FRC80mEU-zZrgQxx4d4mlK0cbhzVH5ExjnnAswYMAtrx--aeE",
  "https://lh6.googleusercontent.com/EVvjQSaXKzuY9xSu0_SlQkJF9-HL-Law8jc5cxFFvfuvXVbc7bt0S_q-a1kU3S4Yz15pytMiKAQ1i8L3p0o4ybVfYp6DEvL87-OjIoXKSmUhkmUr8BFmr48wzyOz1mU-bOEj80P9YdE5FJpL",
  "https://lh5.googleusercontent.com/NlBnu9rOClC7QHh7fLPFjdvKtoK6RKQF6gzED8e5AUH_P9Y5S4l3Kraim9squVVCLm5_E6kyLVkpNRNWNun3rxyE82n4MaCtANdGOfBCJaomAO1YHnJJdvzw26Zwjoa3ZaClTLDd5B0kfz0U",
  "https://lh5.googleusercontent.com/nHTrUf-uBjZ_X6iZaG8K3TLoBka3CZRw43WK118sImE--W62a1_W2HBCndgUXj-BM_xBkvlU5-PscWwWw9OcGg2bO_P4cGpfGitjitLerv4Vd47lPMYlFtgIAmDuWN39OJf5XlV_YotdVw_x",
  "https://lh3.googleusercontent.com/cda95W0UM6g0C3Xa29PfnoRTXqwOpV1n8ZjDiU693rwQKqrotvfzX_PQXdequKJfuh14dTZEwS3sNhX1SF7QszUn33ARzERjLuniKP70Lw_cv1rwz-0wDgmu6h4DfYaMG3yFFGDqypnn4v7U",
  "https://lh6.googleusercontent.com/EPKuXwH2jt3mRGZcrJJw2oGRuMsZ4tLZaL6R56jfYMlZCqWBsvsT5UP6lH2MN6JIUy_HUTYscIH_VUcv5x1EVtj3y0d1Npd6qfjVbrgyzY3UdSDUdBtrEs4MlCmYTcRJfzYJYQmL_smxbMts",
  "https://lh6.googleusercontent.com/rqBc_hr0f7BLEWbGKbaFQY8NOgFjKCAKPXHI9ZFbQKv-Au2tXGy9-ChJ2QbAp_u-nBHVF1kW1bE8-aDVwCpCSpCo228Q2f43g0BwJkfJx6Tw4pH80sfjvIJOPKuNZaQ0FadZIvHsrSJBYyCp",
  "https://lh4.googleusercontent.com/0xeATgVPP2GnX9Yb-932gk1kObN1E3ium7pcqHMyw4yV7tVL3879IY4jv9pTFS2Q1uP_eIBkrKMa7IhUv3fYXjB5_f-ySEizu-HyX6xW1NvN8bjF_j5l9GqUZLhBMvIUWnXhi779-mbW3kwe",
  "https://lh4.googleusercontent.com/6wXnaehfFshmTP8DVepDtin43TM794yAWCbhVBB9tVPKRMOQ7ET4tR-hlx9dnUqyEXf8f4Xj_iFFMD1gN4qfhe1ezRpKath-cfGWL9aju_EHxVOH-agzkXs3szFhwHSsA1WjZ3dHWqrV0i4O",
  "https://lh4.googleusercontent.com/87rmE_MJ_PAm69IDr21PxrSzkFMWLyOxYMOKAATYbt2avtfMlE0WLqc9RyYJySQmAIT8GSw7My3MsZJr9sis4Iy3je-nCA889E62lWyL5cvbcjMU9Y5S9XJ5IIxk4iy9AKZQcCp7uxxa4vnD",
  "https://lh3.googleusercontent.com/wtHRn317aTTYnAd_dLmXwvfU58blpf2bWp7-M0cmYNwyTrKQSST1qx6dXqF6L8Ro6Aw_2GldUt7FwfWAvkP_-QDcYLlmHhuWtLWKeiuoOQPQjoAAckjsulgzUHX-s5KyJmYnXEcnHTtMfg5P",
  "https://lh4.googleusercontent.com/Zkqm6MJAu9JQU8uNYAXHhHUgZ8Iap5VFZH58NyAiir5b9tG8plQCPG_T9zlXsx1E5euGcrKALNlMjcgTTqdDbBzGJJyHr0yo6XNZZCpDWuEkbP9ufFenBbswbpVErSpddnoKTiyPEAVP7qxM",
  "https://lh4.googleusercontent.com/Nv3GKhYSbjgA-Pdb7RUdzCScVHFQQ-o2uO2SN4ZQpKz7fyvtVWhjtFrO4EGaBo5yH49QJddXmF8J_TwFQXLqj2o6RqRzeB_ekz9gSR3SFrC-3Sqmxdeb65F7eotVcofTvUWcpBMKWyIxR3i1",
  "https://lh4.googleusercontent.com/LYOsQPO947UUxtI9-G_ICRs3NDgOnhJ7illyuzuTirw62oITaY_o0u5m50eWziz_4erq6KndbTadPcsUMsmbO5gAgWy3DJuSPxjb1N6OEhVYL1SXna7L-tNthx_Ci0UM6hqKx4-LegeoRx_r",
  "https://lh6.googleusercontent.com/IqmmBhtEGx1GKOMDfk5CRlSJA6E9v-qw4O9fVbLFRhlcNQO1hKoQ7iEUZ9ais7T0b_AIywF_Wco2QLPobBuoL4Px5Px8lgE4uj0zNn1jm4ouWhT7OAHuGuuyxUP-BKR6h5Sqe62dGaMatNJI",
  "https://lh3.googleusercontent.com/aJDjNcd9ickvilfbFWnh3etOB0nQxvcKw1PO2_DK6mpOfI2ZzjxgFiFv3f5jdxOBwlqij2bXoAuqp8c3sgp6gwJ1dVZweL95paR1fLyqTreI-_L0k-qtzNB7upp9TfIHzsd_5_mvgpykjqTu",
  "https://lh3.googleusercontent.com/dQkbtiStmWiatiDAnYdvbe8Ku9oDOnQEAenmQP_aoON11m29DuoBDuyCpKcD_Cz1T7F4gdeITpfTpgmOGeG6gvLkvsUvEQ0KuaK7_6NA4DwmvSL6TE-plY8Md9ElHbfkg9hTGalxUBkaH_vA",
  "https://lh3.googleusercontent.com/Iwu768phCsr9RmirikfVBPMAKa0TNrttH9S3z2bBJHYTd-7VFwUi_u-65RUYxZOE4K4Bi-d4cqoAR2j_VuxrKiKy7eulAh6IdzDjV4DSjlXrEZF3gVQUTh6cTJ2M6_Igl7biIK3aD5a3w3yM",
  "https://lh3.googleusercontent.com/RaVIx-xocDYXYouQhMFmJl9vecLDjAJZN2f0dbno_Ex84iipdLgxFl16-wk7nKcyh1BQMzfh9XL8KE8Nwl1faXRqzbCGvXB7oFmTkdXEcWweJTSSK0Rwsi13EDKCvJ9YC5ufrZjT-r_wVgUc",
  "https://lh5.googleusercontent.com/W9X1RWxC__e2iO5lGKLheLxvHUCYFsU9lZrr47HuMVU9R-PE1hiYkx1xaG1py_Oefi-x_BNJa33KU_d8zmRoPTOMJ5_oZyj-s8876XGS3YXT6FJ60uIuLf7Oxvu1qekSSvROrUwubSCuustS",
  "https://lh6.googleusercontent.com/n7wgYvny5yHI1vB8SFcEOlyNu4WbXKASGo93mA81dObpJtNy3TCcrz6ApnD2H3O5I2m-tX1GQKw-VsS1qVu2jxeLEGXINnB83tFc0d1mlu4dHw_j24aqK8eGGfxDlUQTce8GGdnYVhgjY-LF",
  "https://lh5.googleusercontent.com/FLu2kxoUVnFIt-I4cbj-JhsfUNZp9bzWnccCeG4jrbTR_lDfaKd6SvK_ylR1nsy-mixdOXSy-QrAI5MyBQgS22CAeKP-2hKm9VqK3tkgULk3DSry5fR8NvrFkV6wFsupRXf-wFbLkzAMIFew",
  "https://lh5.googleusercontent.com/fbgdePnktXTvXNIr3f8ElkqhxXd9B7C-27JmrFozk8Hc3CrRpsJCpjZxSpgpMU79sqCM1ziX6PxAN8Z7wFjBYEx3MhCdU9YMD52E8Qb1XKO6QReVOqygcdARcQBOimeE6IHyO9ExoiR4Q0K3",
  "https://lh5.googleusercontent.com/eBOOh8YC6nrK-KzPAgUMbCLQwEHdNq5cbhkQi52OvsFuIN-tl-bCaZgsL79WIepdyOqMh_TtyF3HPJpB_kuvNEAW5gZJJSEK27CMVgevGp-9Xp1GUSEDqog4mNRxNkqW4peY2b-wuJ9T4f_6",
  "https://lh3.googleusercontent.com/8bS4pCkkhLtyb5W8ji4MVBTCZR44kOS2PoP_xgKEWnm3Oxka6dUIok2fdluQXYeAjOWpREPhwh2q2lrta_hhEpfc5yBgAHk3XzfmMo95WgN4EyGFevGI7MRlsLLtW00W9kabsNFZE3YSjF8U",
  "https://lh6.googleusercontent.com/XsMY9ycqoQ3QZ1JMxHRwK5jQOA84M-2mv3hLMFUVY3dEmo0skem1HI-wuCqS1rOg_FjdgezozscUii7-x1bc0-l0vEl1NiYAjjEJ1YZOW0v9xqmoKIJpQ67umScObIa0p1Ij1SgFwAOmwoyx",
  "https://lh4.googleusercontent.com/1Kl_ON-lw1eH-bDXew52UCNmm1_7spg6fcWziV9E27sCK_NbzybRzSXu3hvPjY0ClUlwrm_4OshEusBeWpD29ZutcYBUEd3xdV4BNKdRcEvtTobxP2u92bCCUal-p7IA5VVEluYmNbJ-gHqq",
  "https://lh5.googleusercontent.com/2d6noRCGEwv4UOtf_O2yfVNDV_cb_t13UCoUnTu_uG_A81xOp_LorHlShfk9_Eb4-NIaFtPFxoltRb_2cc7EDMegyBQdAfo33prBA3bLqQM5pBjGspyk_MmDzKvhbopfnbpCU8Al7dZLmdM-",
  "https://lh4.googleusercontent.com/cb4AIlTD37EaXX8VBN0XFg7W1-izYXMW-SMrcXVupZZIaoCt0cuC3gLJzltKws1QxwErvuOY4cnhff2Ziw5LisaDYhdzdSXKP45esXzIlOkJbKiq8QpZ30a_a71zzcadgBvd7GyuNsU8Lxkm",
  "https://lh6.googleusercontent.com/F2htWk4zyl8AFYJ1-aWNiR3_240R-LDDmTWHrG4YwkRV3CV136xtaZdAX_SkLOTCKeC70TdbFnU0r4fl5XW8AnMpCqLywIG2yFxaK4MLXAHxo75DeWf2VutvidZcvDwFv3iTV7esHP2aMSXa",
  "https://lh6.googleusercontent.com/EQEsza1v5JBCp1Kw2JTvKXrzrLtq5GW5qN2CCP5MiE_i4xrxyyUleuHL72_6_rM8KID8u2EQFQGaUFRxQIcVlrpP1qQ_V6jUuXeqyJvTZs3TJC_NyHTtrDdYsqb1V_BHMFn5xdX2-w3ubHSU",
  "https://lh6.googleusercontent.com/KPEbiDf6sB9sixoTXsu9pYEnnVzWP0LwuPnV1zw1cs6ZaS-V21WIWTrQmTHcTEN4ABW7cvQ9wCGzmwBEPhOPmI9hR0IX1gFdE0P6EJ3sYMd4xH7vmA42_J6-m9gCe53lmEiWnW68RU0qeKla",
  "https://lh6.googleusercontent.com/v3KJ7n1zhTgLmQp1l90EnTbv_p_cwbCZu5Q5YcFjcPk8pR_vjqoc5J3e_-qPGjYcRB3f-QsFS5By0QG_aHDsFrk3wv3hEPHRHdArW77Bbdlg1HgFKy46Lk6cIN3GI6oSDBIHuMwt4Dw9No7-",
  "https://lh4.googleusercontent.com/qbS15bGtuXL5aLDnNHjkdYrf6Gk8Nb8cF6Htf-4Ql04VJZpN_x6TyfYAX_M-E6jZpCBsou3lQeWQmyLPRdqB-Bm6c44CGWygZ-kH3X_YkTCdFWXUNQwSLujFlNCmWt7S6FvAiZ7JDLzacJHw",
  "https://lh4.googleusercontent.com/xzJSJNtI94EhDDzDzVvizhoACAYB7UdosW7yq668qtCJ5JoumYtstcV-icjut3k3V2hN-CIn8ciIPAHXP5U618bW0jNBVgwjO94t1NPiio9Z-r6HjW6iE9t0o_VqxHpA2ez_vVQyM1XBNnOG",
  "https://lh5.googleusercontent.com/EXMjv7BrmU-1HZ0Zm63GvfwceYoCqAUk6aTIt0y1Fw7MOFwpSO9sMJDJoQx944mGyuXGozMt2U5IOki9OvIlW6mCWTdNd8DubtOFrA3lXcaJtbGE8VLXTOh1Gr4rYi7ddEirnLiuAm-e0D5f",
  "https://lh4.googleusercontent.com/pX5MkrUP0baHc_5sb54MsO888QE22QyRxQz1nQwMQLlw_zTdmCz73ecahJYCcmwY5U2vexiFRWR_oRKVMX__SCC0vxIlL56mo7tpc31a524EuvtEIGcsxAoG6TIOMM1SCe8-Y9ho1Fp9-yfm",
  "https://lh5.googleusercontent.com/M-o4Cll71BYpLPoowRxrpjnUBgX6isFhX0hHUImPFM6Inx4feawPx8jI5HhqqNRd9fqYYNCP-FonEvIlqe9K9tIv7HYEKd47nEbx9wVHClV7rIzNkHjwyRWHaWm7SIOf-5KrcLAAniuA02M7",
  "https://lh3.googleusercontent.com/ui39a-guz8tCxfSplNJGi90efcHuVjN1kv07rCRE73onkCes94lKhTRaQ5zTX-ICle2WEY8iY3XyIStiTPADqMr4QA8mm8Rh67M_Gix7-1FZ7Jyl77oo5w-KXqGp7w0rxle6LaqDS4ztr6dg",
];

router.get("/contest", async (req, res) => {
  const data = await axios.get("https://spreadsheets.google.com/feeds/cells/10p5a8hQv0EI-VkgwC2xIumq_QFJFfnRy4Km_iTICEIE/1/public/full?alt=json");

  const entries = data.data.feed.entry;
  const results = {};
  entries
    .filter((e) => e["gs$cell"].col === "3")
    .forEach((e) => {
      const raw = e["gs$cell"]["inputValue"];
      const values = raw.match(/(\#)\w+/g);
      if (values) {
        values.forEach((r) => {
          r = r.trim();
          if (results[r]) {
            let steps = results[r].steps;
            steps++;
            results[r] = {
              name: results[r].name,
              steps: steps,
              href: results[r].href,
            };
          } else {
            const imageIndex = parseInt(r.replace("#", "")) - 1;
            if (imageIndex > 98) imageIndex --;

            results[r] = {
              name: r,
              steps: 1,
              href: contestImages[imageIndex],
            };
          }
        });
      }
    });

  res.json(Object.values(results));
});

router.get("/cmw/:email/:wallet", async (req, res) => {
  return false;
  // if (!req.params.email || !req.params.wallet) {
  //   return res.json("invalid call");
  // }

  // // let hash = crypto.createHash("md5").update(req.params.email).digest("hex");
  // let hash = req.params.email;

  // let whitelisted = false;
  // try {
  //   await client.query(q.Get(q.Match(q.Index("cmw_by_hash"), hash)));
  //   whitelisted = true;
  // } catch (ex) {}

  // if (!whitelisted) {
  //   await client.query(q.Create(q.Collection("cmw"), { data: { hash, wallet: req.params.wallet } }));
  //   whitelisted = true;
  // }

  // return res.json({ whitelisted });
});

router.get("/testnet/nft/:id", async (req, res) => {
  const factoryContract = new web3testnet.eth.Contract(factoryAbi, FACTORY_ADDR_TESTNET);
  const { edition, collectibleNo } = await factoryContract.methods.collectibleInfo(req.params.id).call();
  return res.json({
    name: edition.name,
    description: edition.description,
    image: edition.uri,
    attributes: {
      collectibleNo,
      limit: edition.limit,
    },
  });
});

router.get("/nft/:id", async (req, res) => {
  return res.json(req.params.id);
});

app.use(bodyParser.json());
app.use(cors());
app.use(limiter);
app.use("/.netlify/functions/api", router); // path must route to lambda

module.exports = app;
module.exports.handler = serverless(app);
