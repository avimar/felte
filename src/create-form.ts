import { get } from 'svelte/store';
import { createStores } from './stores';
import type {
  Form,
  FormConfig,
  FormConfigWithInitialValues,
  FormConfigWithoutInitialValues,
} from './types';

function isInputElement(el: EventTarget): el is HTMLInputElement {
  return (el as HTMLInputElement)?.nodeName === 'INPUT';
}

function isTextAreaElement(el: EventTarget): el is HTMLTextAreaElement {
  return (el as HTMLTextAreaElement)?.nodeName === 'TEXTAREA';
}

export function createForm<D extends Record<string, unknown>>(
  config: FormConfigWithInitialValues<D>
): Form<D>;
export function createForm<D extends Record<string, unknown>>(
  config: FormConfigWithoutInitialValues<D>
): Form<D | undefined>;
export function createForm<D extends Record<string, unknown>>(
  config: FormConfig<D>
): Form<D | undefined> {
  config.useConstraintApi ??= false;
  const { isSubmitting, data, errors, touched, isValid } = createStores<D>(
    config
  );
  async function handleSubmit(event: Event) {
    try {
      isSubmitting.set(true);
      event.preventDefault();
      touched.update((t) => {
        return Object.keys(t).reduce(
          (acc, key) => ({
            ...acc,
            [key]: true,
          }),
          t
        );
      });
      const currentErrors = get(errors);
      const hasErrors = Object.keys(currentErrors).some(
        (key) => !!currentErrors[key]
      );
      if (hasErrors) {
        config.useConstraintApi &&
          (event.target as HTMLFormElement).reportValidity();
        return;
      }
      await config.onSubmit(get(data));
    } catch (e) {
      if (!config.onError) throw e;
      config.onError(e);
    } finally {
      isSubmitting.set(false);
    }
  }

  function newDataSet(values: D) {
    touched.update((current) => {
      const untouchedKeys = Object.keys(current).filter((key) => !current[key]);
      return untouchedKeys.reduce(
        (acc, key) => ({
          ...acc,
          [key]: values[key] !== config.initialValues[key],
        }),
        current
      );
    });
    return data.set(values);
  }

  function setFormFieldsDefaultValues(node: HTMLFormElement) {
    const defaultData: Record<string, unknown> = {};
    for (const el of node.elements) {
      if ((!isInputElement(el) && !isTextAreaElement(el)) || !el.name) continue;
      touched.update((t) => ({ ...t, [el.name]: false }));
      if (isInputElement(el) && el.type === 'checkbox') {
        if (typeof defaultData[el.name] === 'undefined') {
          const checkboxes = node.querySelectorAll(`[name=${el.name}]`);
          if (checkboxes.length === 1) {
            defaultData[el.name] = el.checked;
            continue;
          }
          defaultData[el.name] = el.checked ? [el.value] : [];
          continue;
        }
        if (Array.isArray(defaultData[el.name]) && el.checked) {
          (defaultData[el.name] as string[]).push(el.value);
        }
        continue;
      }
      if (isInputElement(el) && el.type === 'radio' && el.checked) {
        defaultData[el.name] = el.value;
        continue;
      }
      defaultData[el.name] = el.type.match(/^(number|range)$/)
        ? +el.value
        : el.value;
    }
    data.set(defaultData as D);
  }

  function form(node: HTMLFormElement) {
    setFormFieldsDefaultValues(node);

    function setCheckboxValues(target: HTMLInputElement) {
      const checkboxes = node.querySelectorAll(`[name=${target.name}]`);
      if (checkboxes.length === 1)
        return data.update((data) => ({
          ...data,
          [target.name]: target.checked,
        }));
      return data.update((data) => ({
        ...data,
        [target.name]: Array.from(checkboxes)
          .filter((el: HTMLInputElement) => el.checked)
          .map((el: HTMLInputElement) => el.value),
      }));
    }

    function setRadioValues(target: HTMLInputElement) {
      const radios = node.querySelectorAll(`[name=${target.name}]`);
      const checkedRadio = Array.from(radios).find(
        (el) => isInputElement(el) && el.checked
      ) as HTMLInputElement | undefined;
      data.update((data) => ({ ...data, [target.name]: checkedRadio?.value }));
    }

    function handleInput(e: InputEvent) {
      const target = e.target;
      if (!isInputElement(target) && !isTextAreaElement(target)) return;
      if (target.type === 'checkbox' || target.type === 'radio') return;
      if (!target.name) return;
      touched.update((current) => ({ ...current, [target.name]: true }));
      data.update((data) => ({
        ...data,
        [target.name]: target.type.match(/^(number|range)$/)
          ? +target.value
          : target.value,
      }));
    }

    function handleChange(e: Event) {
      const target = e.target;
      if (!isInputElement(target)) return;
      if (!target.name) return;
      touched.update((current) => ({ ...current, [target.name]: true }));
      if (target.type === 'checkbox') setCheckboxValues(target);
      if (target.type === 'radio') setRadioValues(target);
    }

    function handleBlur(e: Event) {
      const target = e.target;
      if (!isInputElement(target) && !isTextAreaElement(target)) return;
      if (!target.name) return;
      touched.update((current) => ({ ...current, [target.name]: true }));
    }

    node.addEventListener('input', handleInput);
    node.addEventListener('change', handleChange);
    node.addEventListener('focusout', handleBlur);
    node.addEventListener('submit', handleSubmit);
    const unsubscribeErrors = config.useConstraintApi
      ? errors.subscribe(($errors) => {
          for (const el of node.elements) {
            if ((!isInputElement(el) && !isTextAreaElement(el)) || !el.name)
              continue;
            el.setCustomValidity($errors[el.name] || '');
          }
        })
      : undefined;

    return {
      destroy() {
        node.removeEventListener('input', handleInput);
        node.removeEventListener('change', handleChange);
        node.removeEventListener('foucsout', handleBlur);
        node.removeEventListener('submit', handleSubmit);
        unsubscribeErrors?.();
      },
    };
  }

  return {
    form,
    data: { ...data, set: newDataSet },
    errors,
    touched,
    handleSubmit,
    isValid,
    isSubmitting,
  };
}