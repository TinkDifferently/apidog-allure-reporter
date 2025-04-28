import allure from "../allure";
import {apidogData} from "../models/apidogData";
import handleDone from "./handleDone";

export function handleScenario(apidogData: apidogData) {
    allure.startGroup()
    handleDone(apidogData)
}
