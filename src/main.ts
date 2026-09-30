import { createApp } from "vue";
import App from "./App.vue";
import "./styles/fonts.css";
import "./styles/tailwind.css";
import "./styles/game.css";
const vueApp = createApp(App);
vueApp.mount("#app");
if (import.meta.hot) import.meta.hot.dispose(() => vueApp.unmount());
