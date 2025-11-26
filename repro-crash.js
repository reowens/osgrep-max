"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const transformers_1 = require("@huggingface/transformers");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Initializing pipeline...");
        const p = yield (0, transformers_1.pipeline)("feature-extraction", "onnx-community/granite-embedding-30m-english-ONNX", { dtype: "q4" });
        console.log("Pipeline initialized.");
        // await p.dispose(); // Uncommenting this might fix it
        console.log("Exiting...");
        // process.exit(0);
    });
}
run();
//# sourceMappingURL=repro-crash.js.map