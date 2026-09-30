import { createApp } from "vue";
import App from "./App.vue";
import "./styles/fonts.css";
import "./styles/game.css";
const app = createApp(App);
app.mount("#app");
if (import.meta.hot) import.meta.hot.dispose(() => app.unmount());
