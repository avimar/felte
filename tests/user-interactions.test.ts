import { screen, waitFor } from '@testing-library/dom';
import { removeAllChildren, createInputElement, createDOM } from './common';
import { createForm } from '../src';
import userEvent from '@testing-library/user-event';
import { get } from 'svelte/store';

function createLoginForm() {
  const formElement = screen.getByRole('form') as HTMLFormElement;
  const emailInput = createInputElement({ name: 'email', type: 'email' });
  const passwordInput = createInputElement({
    name: 'password',
    type: 'password',
  });
  const submitInput = createInputElement({ type: 'submit' });
  const accountFieldset = document.createElement('fieldset');
  accountFieldset.name = 'account';
  accountFieldset.append(emailInput, passwordInput);
  formElement.append(accountFieldset, submitInput);
  return { formElement, emailInput, passwordInput, submitInput };
}

function createSignupForm() {
  const formElement = screen.getByRole('form') as HTMLFormElement;
  const emailInput = createInputElement({ name: 'email', type: 'email' });
  const passwordInput = createInputElement({
    name: 'password',
    type: 'password',
  });
  const showPasswordInput = createInputElement({
    name: 'showPassword',
    type: 'checkbox',
  });
  const confirmPasswordInput = createInputElement({
    name: 'confirmPassword',
    type: 'password',
  });
  const publicEmailYesRadio = createInputElement({
    name: 'publicEmail',
    value: 'yes',
    type: 'radio',
  });
  const publicEmailNoRadio = createInputElement({
    name: 'publicEmail',
    value: 'no',
    type: 'radio',
  });
  const accountFieldset = document.createElement('fieldset');
  accountFieldset.name = 'account';
  accountFieldset.append(
    emailInput,
    passwordInput,
    showPasswordInput,
    publicEmailYesRadio,
    publicEmailNoRadio,
    confirmPasswordInput
  );
  formElement.appendChild(accountFieldset);
  const profileFieldset = document.createElement('fieldset');
  profileFieldset.name = 'profile';
  const firstNameInput = createInputElement({ name: 'firstName' });
  const lastNameInput = createInputElement({ name: 'lastName' });
  const bioInput = createInputElement({ name: 'bio' });
  profileFieldset.append(firstNameInput, lastNameInput, bioInput);
  formElement.appendChild(profileFieldset);
  const pictureInput = createInputElement({
    name: 'profile.picture',
    type: 'file',
  });
  formElement.appendChild(pictureInput);
  const extraPicsInput = createInputElement({
    name: 'extra.pictures',
    type: 'file',
  });
  extraPicsInput.multiple = true;
  formElement.appendChild(extraPicsInput);
  const submitInput = createInputElement({ type: 'submit' });
  const techCheckbox = createInputElement({
    type: 'checkbox',
    name: 'preferences',
    value: 'technology',
  });
  const filmsCheckbox = createInputElement({
    type: 'checkbox',
    name: 'preferences',
    value: 'films',
  });
  formElement.append(techCheckbox, filmsCheckbox, submitInput);
  return {
    formElement,
    emailInput,
    passwordInput,
    confirmPasswordInput,
    showPasswordInput,
    publicEmailYesRadio,
    publicEmailNoRadio,
    firstNameInput,
    lastNameInput,
    bioInput,
    pictureInput,
    extraPicsInput,
    techCheckbox,
    filmsCheckbox,
    submitInput,
  };
}

describe('User interactions with form', () => {
  beforeAll(() => {
    createDOM();
  });

  afterEach(() => {
    const formElement = screen.getByRole('form');
    removeAllChildren(formElement);
  });

  test('Sets default data correctly', () => {
    const { form, data } = createForm({
      onSubmit: jest.fn(),
    });
    const { formElement } = createSignupForm();
    form(formElement);
    const $data = get(data);
    expect($data).toEqual(
      expect.objectContaining({
        account: {
          email: '',
          password: '',
          confirmPassword: '',
          showPassword: false,
          publicEmail: undefined,
        },
        profile: {
          firstName: '',
          lastName: '',
          bio: '',
          picture: undefined,
        },
        extra: {
          pictures: expect.arrayContaining([]),
        },
        preferences: expect.arrayContaining([]),
      })
    );
  });

  test('Sets custom default data correctly', () => {
    const { form, data } = createForm({
      onSubmit: jest.fn(),
    });
    const {
      formElement,
      emailInput,
      bioInput,
      publicEmailYesRadio,
      showPasswordInput,
      techCheckbox,
    } = createSignupForm();
    emailInput.value = 'jacek@soplica.com';
    const bioTest = 'Litwo! Ojczyzno moja! ty jesteś jak zdrowie';
    bioInput.value = bioTest;
    publicEmailYesRadio.checked = true;
    showPasswordInput.checked = true;
    techCheckbox.checked = true;
    form(formElement);
    const $data = get(data);
    expect($data).toEqual(
      expect.objectContaining({
        account: {
          email: 'jacek@soplica.com',
          password: '',
          confirmPassword: '',
          showPassword: true,
          publicEmail: 'yes',
        },
        profile: {
          firstName: '',
          lastName: '',
          bio: bioTest,
          picture: undefined,
        },
        extra: {
          pictures: expect.arrayContaining([]),
        },
        preferences: expect.arrayContaining(['technology']),
      })
    );
  });

  test('Input and data object get same value', () => {
    const { form, data } = createForm({
      onSubmit: jest.fn(),
    });
    const { formElement, emailInput, passwordInput } = createLoginForm();
    form(formElement);
    userEvent.type(emailInput, 'jacek@soplica.com');
    userEvent.type(passwordInput, 'password');
    const $data = get(data);
    expect($data).toEqual(
      expect.objectContaining({
        account: {
          email: 'jacek@soplica.com',
          password: 'password',
        },
      })
    );
  });

  test('Calls validation function on submit', async () => {
    const validate = jest.fn(() => ({}));
    const onSubmit = jest.fn();
    const { form } = createForm({
      onSubmit,
      validate,
    });
    const { formElement } = createLoginForm();
    form(formElement);
    formElement.submit();
    expect(validate).toHaveBeenCalled();
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          account: {
            email: '',
            password: '',
          },
        })
      )
    );
  });

  test('Calls validation function on submit without calling onSubmit', async () => {
    const validate = jest.fn(() => ({ account: { email: 'Not email' } }));
    const onSubmit = jest.fn();
    const { form } = createForm({
      onSubmit,
      validate,
    });
    const { formElement } = createLoginForm();
    form(formElement);
    formElement.submit();
    expect(validate).toHaveBeenCalled();
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
  });

  test('Calls validate on input', async () => {
    const validate = jest.fn(() => ({}));
    const onSubmit = jest.fn();
    const { form, errors } = createForm({
      onSubmit,
      validate,
    });
    const { formElement, emailInput } = createLoginForm();
    form(formElement);
    userEvent.type(emailInput, 'jacek@soplica.com');
    get(errors);
    await waitFor(() => expect(validate).toHaveBeenCalled());
  });
});
