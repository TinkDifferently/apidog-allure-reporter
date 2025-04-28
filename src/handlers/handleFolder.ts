import {apidogData} from "../models/apidogData";
import allure from "../allure";
import handleDone from "./handleDone";

export function handleFolder(data: apidogData) {
    allure.startGroup()
    handleDone(data)
}
