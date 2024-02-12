import { expect, type Locator, type Page } from './test-utils.js';

export enum FormFieldType {
    CHECKBOX = "checkbox",
	DATE = "date",
    FILE = "file",
    SELECT = "select",
    SELECT_AUTOCOMPLETE = "select-autocomplete",
    SELECT_MULTIPLE_AUTOCOMPLETE = "select-multi-autocomplete",
    TEXT = "text",
}

type FormField = {
    locator: Locator;
    type: FormFieldType;
};

export class FormContent {
    readonly formTitle: Locator;
    readonly saveButton: Locator;
    readonly cancelButton: Locator;
    readonly fields: Map<string, FormField>;
    name: string | RegExp;

    constructor(public readonly page: Page, name: string | RegExp, fields: {name: string, type: FormFieldType}[]) {
        this.formTitle = this.page.getByTestId("modal-title");
        this.saveButton = this.page.getByTestId("save-button");
        this.cancelButton = this.page.getByTestId("cancel-button");
        this.name = name;
        this.fields = new Map(fields.map(field => [field.name, {locator: this.page.getByTestId("form-input-" + field.name.replace('_', '-')), type: field.type}]));
    }

    async fill(values: { [k: string]: any }) {
        let temp = {};

        for (const key in values) {
            const field = this.fields.get(key);

            if (field?.locator.innerText !== values[key]) {
                switch (field?.type) {
                    case FormFieldType.CHECKBOX:
                        if (values[key] === "true") {
                            await field.locator.check();
                        }
                        else if (values[key] === "false") {
                            await field.locator.uncheck();
                        }
                        break;
                    case FormFieldType.FILE:
                        await field.locator.setInputFiles(values[key]);
                        break;
                    case FormFieldType.SELECT:
                        await field.locator.selectOption(values[key]);
                        break;
                    case FormFieldType.SELECT_AUTOCOMPLETE:
                        await field.locator.click();
                        
                        if (typeof values[key] === "object" && 'request' in values[key]) {
                            const responsePromise = this.page.waitForResponse(resp => resp.url().includes(values[key].request.url) && resp.status() === 200);
                            await expect(this.page.getByRole("option", {name: values[key].value, exact: true})).toBeVisible();
                            await this.page.getByRole("option", {name: values[key].value, exact: true}).click();
                            
                            const response = await responsePromise;
                            expect((await response.json()).category).toBe(values[key].category);
                        } else {
                            await expect(this.page.getByRole("option", {name: values[key], exact: true})).toBeVisible();
                            await this.page.getByRole("option", {name: values[key], exact: true}).click();
                        }
                        break;
                    case FormFieldType.SELECT_MULTIPLE_AUTOCOMPLETE:
                        await field.locator.click();
                        for (const val of values[key]) {
                            await expect(this.page.getByRole("option", {name: val, exact: true})).toBeVisible();
                            await this.page.getByRole("option", {name: val, exact: true}).click();
                        }
                        if (await field.locator.isEnabled()) {
                            await field.locator.press("Escape");
                        }
                        break;
                    case FormFieldType.DATE:
                        await field.locator.clear();
                    default:
                        await field?.locator.fill(values[key]);
                        break;
                }
            }
            // await this.page.waitForTimeout(20);
        }
    }

    async hasTitle() {
        await expect(this.formTitle).toBeVisible();
        await expect(this.formTitle).toHaveText(this.name);
    }
}