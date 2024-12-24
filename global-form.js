// Mask Options 
const SPMaskBehavior = function (val) {
  return val.replace(/\D/g, '').length === 11 ? '(00) 00000-0000' : '(00) 0000-00009';
}
const spOptions = {
  clearIfNotMatch: false,
  onKeyPress: function (val, e, field, options) {
    field.mask(SPMaskBehavior.apply({}, arguments), options);
  }
};


// Toggle Modal
window.toggleContactUsModal = () => {
  const modalContactUs = document.querySelector(".modal-contact-us")
  if(!modalContactUs) return

  document.querySelector("body").classList.toggle("overflow-hidden");
  modalContactUs.classList.toggle("modal-contact-us--openned");
}

// Register component
document.addEventListener("DOMContentLoaded", () => {
  const globalFormElements = document.querySelectorAll(".global-form[data-component=global-form]");
  globalFormElements.forEach((globalForm) => {
    GlobalForm(globalForm).onInit()
  })
})

//TODO: Loading inicial de 1 segundo enquanto formulario carrega, principalmente na versão section
//TODO: Loading antes de enviar

// Component
function GlobalForm(form) {
  const isModal = form.getAttribute("data-is-modal") === 'true';
  const blockName = form.getAttribute("data-block-name") || "modal-contact-us";
  const empreendName = form.getAttribute("data-empreend") || ""
  const stepsHistory = []
  let emailValido = true;
  const propsState = {
    nome: "",
    email: "",
    ddi: "",
    telefone: "",
    assunto: "",
    forma_de_contato: "",
    tipo_contato: "",
    mensagem: "",
    empresa: "",
    arquivo: "",
    Aceito_Contato_Email: "",
    Aceito_Contato_WhatsApp: "",
    Aceito_Contato_Telefone: "",
    reset: () => {
      Object.keys(propsState).forEach((key) => {
        if (typeof propsState[key] === 'function') return 
        propsState[key] = ""
      })
    }
  }

  const beforeRenderProp = {
    nome: (value) => {
      return value.split(" ")[0]
    },
    telefone: (value) => {
      value=value.replace(/\D/g,""); //Remove tudo o que não é dígito
      value=value.replace(/^(\d{2})(\d)/g,"($1) $2"); //Coloca parênteses em volta dos dois primeiros dígitos
      return value.replace(/(\d)(\d{4})$/,"$1-$2");
    }
  }

  const getStepSelectors = (type, stepName) => {
    const selectors = {
      'text': {
        inputSelector: `.${blockName}__step-item__response__text.dynamic-input[data-prop-input=${stepName}]`,
        parentSelector: `.${blockName}__step-item[data-step-name=${stepName}] .${blockName}__step-item__response`,
        errorMessageSelector: `.${blockName}__step-item__error[data-prop-input=${stepName}]`
      },
      'options': {
        inputSelector: `.${blockName}__step-item__response__radio-btn>input[type=radio][name=${stepName}]`,
        parentSelector: `.${blockName}__step-item[data-step-name=${stepName}] .${blockName}__step-item__response--radio-btns`,
      }
    }
    return selectors[type]
  }

  const selectAllCheckboxesOfAcceptContacts = () => {
    const checkboxes = form.querySelectorAll(`input[type=checkbox][name].accept-contact-checkbox`)
    checkboxes.forEach((checkbox) => {
      if(!checkbox.checked) checkbox.click()
    })
  }

  const stepsJourney = {
    nome: {
      validate: () => {
        const { nome } = propsState
        return nome.trim().length >= 3
      },
      nextStep: 'email',
      ...getStepSelectors('text', 'nome')
    },
    email: {
      validate: async () => {
        const { email } = propsState
        return String(email)
        .toLowerCase()
        .match(
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        ) && await safetyMails(email)
        
      },
      nextStep: 'telefone',
      ...getStepSelectors('text', 'email')
    },
    telefone: {
      validate: () => {
        const telefone = propsState.telefone.replace(/[^\w\s]/gi, '').replace(' ', '')
        const ddi = propsState.ddi.replace(/[^\w\s]/gi, '').replace(' ', '')
        const ddiCheckbox = form.querySelector("input[type='checkbox'][data-checkbox-ddi=true].checkbox-ddi")
        const validateDDI = ddiCheckbox && ddiCheckbox.checked
        
        if (validateDDI) {
          if (ddi.length < 1 || ddi.length > 3) return false
          if (telefone.length < 5 || telefone.length > 10) return false
        } else {
          if (telefone.length !== 10 && telefone.length !== 11) return false
        }
        return true
      },
      nextStep: 'assunto',
      ...getStepSelectors('text', 'telefone')
    },
    assunto: {
      beforeShow: selectAllCheckboxesOfAcceptContacts,
      validate: () => {
        const { assunto } = propsState
        if (!assunto || assunto.trim().length === 0) return false
        if (
          assunto === "Relacionamento" || 
          assunto === "Financeiro" || 
          assunto === "Fornecedor"
        ) {
          const { Aceito_Contato_Email, Aceito_Contato_Telefone, Aceito_Contato_WhatsApp } = propsState
          if (Aceito_Contato_Email !== "Sim" && Aceito_Contato_Telefone !== "Sim" && Aceito_Contato_WhatsApp !== "Sim") return false
        }

        // Post validate
        if (assunto === "Quero comprar um imóvel") {
          form.setAttribute("data-hubid-form", "mensagem");
          form.setAttribute("data-tipo", "Email");
          form.setAttribute('name', 'formEmail');
          form.id = "formEmail1"
          const destinatarioInput = form.querySelector("input[type=hidden][name=destinatario]")
          if(destinatarioInput) {
            destinatarioInput.remove()
          }
        }
        if (
          assunto === "Relacionamento" || 
          assunto === "Financeiro" || 
          assunto === "Fornecedor" || 
          assunto === "Imprensa"   ||
          assunto === "Denuncias"
        ) {
          form.tipo_contato.value = assunto
          form.setAttribute("data-hubid-form", "institucional");
          form.setAttribute("data-tipo", "institucional");
          form.setAttribute('name', 'formInstEmail');
          form.id = "formInstEmail"
          const inputDestinatario = form.querySelector('input[name="destinatario"]')
          if (!inputDestinatario && assunto !== "Denuncias") {
            const templateInputDestinatario = `<input type="hidden" name="destinatario" value="g@gmail.com"></input>`
            form.insertAdjacentHTML('beforeend', templateInputDestinatario);
          }
          if (!inputDestinatario && assunto === "Denuncias") {
            const templateInputDestinatario = `<input type="hidden" name="destinatario" value="g2@gmail.com"></input>`
            form.insertAdjacentHTML('beforeend', templateInputDestinatario);
          }
        }
        console.log(form,"form")
        return true
      },
      nextStep: {
        "Quero comprar um imóvel": "forma_de_contato",
        "Relacionamento": "mensagem",
        "Financeiro": "mensagem",
        "Fornecedor": "fornecedor",
        "Imprensa": "imprensa-success",
        "Denuncias": "mensagem",
      },
      ...getStepSelectors('options', 'assunto')
    },
    forma_de_contato: {
      beforeShow: selectAllCheckboxesOfAcceptContacts,
      validate: () => {
        const { forma_de_contato } = propsState
        if (!forma_de_contato || forma_de_contato.trim().length === 0) return false

        const { Aceito_Contato_Email, Aceito_Contato_Telefone, Aceito_Contato_WhatsApp } = propsState
        if (
          Aceito_Contato_Email !== "Sim" && 
          Aceito_Contato_Telefone !== "Sim" && 
          Aceito_Contato_WhatsApp !== "Sim"
        ) return false

        if (
          forma_de_contato === "chat" || 
          forma_de_contato === "whatsapp"
        ) {
          form.setAttribute("data-tipo", forma_de_contato);
          form.setAttribute("data-hubid-form", forma_de_contato);
        }
        if (
          forma_de_contato === "mensagem" || 
          forma_de_contato === "telefone"
        ) {
          form.setAttribute("data-tipo", "mensagem");
          form.setAttribute("data-hubid-form", "mensagem");
        }

        return true
      },
      nextStep: {
        "chat": [ "submit", "close" ],
        "mensagem": "mensagem",
        "whatsapp": [ "submit", "close" ],
        "telefone": "telefone-success",
      },
      ...getStepSelectors('options', 'forma_de_contato')
    },
    mensagem: {
      beforeShow: () => {
        const { assunto, nome } = propsState
        const nomeParsed = beforeRenderProp["nome"](nome)
        const mensagemStep = form.querySelector(`.${blockName}__step-item[data-step-name=mensagem]`)
        const textareaMensagem = mensagemStep.querySelector(`.${blockName}__step-item__response__text--textarea`)

        if (assunto === "Quero comprar um imóvel") {
          renderProp('mensagem-question', `${nomeParsed}, quais informações você gostaria de receber?`)
          const newMessageValue = empreendName ? 
            `Olá, gostaria de mais informações sobre o ${empreendName}` :
            `Olá, gostaria de mais informações sobre os empreendimentos.` 

          updatePropsState('mensagem', newMessageValue)
          textareaMensagem.value = newMessageValue
          return
        }
        renderProp('mensagem-question', `${nomeParsed}, como podemos ajudar você?`)
      },
      validate: () => {
        const { mensagem } = propsState
        return mensagem.trim().length >= 3
      },
      nextStep: ['submit', 'success'],
      ...getStepSelectors('text', 'mensagem')
    },
    fornecedor: {
      validate: () => {
        const fornecedorStep = form.querySelector(`.${blockName}__step-item[data-step-name=fornecedor]`)
        const empresaInput = fornecedorStep.querySelector(`input[data-prop-input=empresa]`).parentNode
        const arquivoInput = fornecedorStep.querySelector(`.${blockName}__step-item__response--file`)
        const mensagemInput = fornecedorStep.querySelector(`textarea[data-prop-input=mensagem]`).parentNode
        const { empresa, arquivo, mensagem } = propsState
        
        let isValid = true;

        if(!(empresa.trim().length >= 3)) {
          empresaInput.classList.add("invalid")
          isValid = false
        } else {
          empresaInput.classList.remove("invalid")
        }

        if (!arquivo.length) {
          arquivoInput.classList.add("invalid")
          isValid = false
        } else {
          arquivoInput.classList.remove("invalid")
        }

        if(!(mensagem.trim().length >= 3)) {
          mensagemInput.classList.add("invalid")
          isValid = false
        } else {
          mensagemInput.classList.remove("invalid")
        }

        return isValid
      },
      nextStep: ['submit', 'success'],
    },
    success: {
      beforeShow: () => {
        const { assunto } = propsState

        if (
          assunto === "Relacionamento" ||
          assunto === "Financeiro"
        ) {
          return renderProp('success-description', 'Analisaremos a sua solicitação o quanto antes.')
        }

        if (assunto === "Fornecedor") {
          return renderProp('success-description', 'Compartilharemos internamente as informações cadastradas.')
        }

        renderProp('success-description', `Em breve um especialista lhe enviará as informações${empreendName ? (' sobre o '+ empreendName) : '.' }`)
      }
    },
    'telefone-success': {
      beforeShow: () => {
        eventos('Contato', 'Sucesso Exibir Telefone');
        window.dataLayer.push ({
          'event': 'Sucesso Exibir Telefone'
        });
    
      }
    }
  }

  const getElementStepName = (input) => {
    const stepParent = input.closest(`.${blockName}__step-item[data-step-name]`)
    return stepParent.getAttribute("data-step-name")
  }

  const updatePropsState = (name, value) => {
    propsState[name] = value
  }

  const renderProp = (name, value) => {
    if(beforeRenderProp[name]) {
      value = beforeRenderProp[name](value)
    }

    form.querySelectorAll(`.dynamic[data-prop=${name}]`)
      .forEach(dynamic => {
        dynamic.innerText = value
      })
  }

  const updateAndRenderProp = (name, value) => {
    updatePropsState(name, value)
    renderProp(name, value)
  }

  const updateCurrentStepInfo = ({ question, description, buttonLabel ,typeForm}) => {
    const activeStep = form.querySelector(`.${blockName}__step-item--active`)
    if(typeForm){
      form.tipo_contato.value = typeForm
    }
    // TODO: Implement this update
    if(question) { }

    if (description) {
      const descriptionElement = activeStep.querySelector(`.${blockName}__step-item__question__description`)
      descriptionElement.innerText = description
    }

    if (buttonLabel) { 
      const buttonElement = activeStep.querySelector(`.${blockName}__step-item__button`)
      buttonElement.childNodes[0].nodeValue = buttonLabel
    }
  }

  const validateStep = async (step) => {
    let stepValid = await stepsJourney[step].validate();
    const input = form.querySelector(stepsJourney[step].inputSelector);
    
    const errorMessage = form.querySelector(stepsJourney[step].errorMessageSelector);
    const parent = form.querySelector(stepsJourney[step].parentSelector);
    
    if (stepValid) {
        // Remove classes e oculta mensagem de erro se válido
        input && input.classList.remove('invalid');
        parent && parent.classList.remove('invalid');
        if (errorMessage) {
            errorMessage.classList.remove('invalid');
            errorMessage.style.display = 'none'; // Oculta a mensagem de erro
        }
        return true;
    } else {
        // Adiciona classes e exibe mensagem de erro se inválido
        input && input.classList.add('invalid');
        parent && parent.classList.add('invalid');
        if (errorMessage) {
            errorMessage.classList.add('invalid');
            if(emailValido === false) {
              errorMessage.innerText = 'Confirme se seu e-mail está correto.';
            }
            
            errorMessage.style.display = 'block';
        }
    }

    throw `Invalid ${step}`;
  };


  const disableActiveStep = () => {
    const activeStep = form.querySelector(`.${blockName}__step-item--active`)
    activeStep.classList.remove(`${blockName}__step-item--active`)
  } 

  const activateStep = (newStep) => {
    const stepName = newStep.getAttribute("data-step-name")

    if (stepName) {
      stepsHistory.push(stepName)

      if (
        stepsJourney[stepName] && 
        (typeof stepsJourney[stepName].beforeShow === "function")
      ) { 
        stepsJourney[stepName].beforeShow()
      }
    }

    newStep.classList.add(`${blockName}__step-item--active`)
    window.setTimeout(() => {
      const input = newStep.querySelectorAll(`input:not(.${blockName}__step-item__response__text--prefix)`)
      if (input.length) {
        input[0].focus()
        return
      }

      const textarea = newStep.querySelectorAll("textarea")
      if(textarea.length) textarea[0].focus()
    }, 100);
  }

  const goToStep = (steps) => {
    // if string convert to array
    if (!Array.isArray(steps)) {
      steps = [steps]
    }

    steps.forEach((stepName) => {
      if (stepName === "submit") {
        return submitForm()
      }
      
      if (stepName === "close") {
        return closeForm()
      }

      disableActiveStep()
      const newStep = form.querySelector(`.${blockName}__step-item[data-step-name=${stepName}]`)
      activateStep(newStep)
    })
  }

  const goToStepByPosition = (stepPosition = 1) => {
    disableActiveStep()
    const newStep = form.querySelector(`.${blockName}__step-item:nth-child(${stepPosition})`)
    activateStep(newStep)
  }

  const goToNextStep = async (currentStep) => {
    if (! await validateStep(currentStep)) return

    // if is options
    if(
        typeof stepsJourney[currentStep].nextStep === 'object' && 
        !Array.isArray(stepsJourney[currentStep].nextStep)
      ) {
      const selectedOption = propsState[currentStep]
      return goToStep(
        stepsJourney[currentStep].nextStep[selectedOption]
      )
    }

    goToStep(stepsJourney[currentStep].nextStep)
  }

  const setupNavigationActions = () => {   
    const actionElements = form.querySelectorAll(`[data-step-action=next]:not(button)`)
    actionElements.forEach((element) => {
      element.addEventListener("keydown", (e) => {
        if(e.key !== 'Enter') return

        const stepName = getElementStepName(element)
        goToNextStep(stepName)
      })
    })
    const actionButtons = form.querySelectorAll("button[data-step-action=next]")
    actionButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const stepName = getElementStepName(button)
        goToNextStep(stepName)
      })
    })
    const actionBackAction = form.querySelectorAll(`.step-dots__item[data-step-back-action], .${blockName}__step-item__back-button[data-step-back-action]`)
    actionBackAction.forEach((element) => {
      element.addEventListener("click", (e) => {
        const stepPosition = element.getAttribute("data-step-back-action")
        goToStepByPosition(stepPosition)
      })
    })
    const actionResetButtons =  form.querySelectorAll(`button[data-form-action="close"]`)
    actionResetButtons.forEach(actionResetButtons => {
      actionResetButtons.addEventListener("click", closeForm)
    })
  }

  const setupReactiveInputs = () => {
    const update = (dynamicInput) => {
      const propName = dynamicInput.getAttribute("data-prop-input")
      const propValue = dynamicInput.value
      updateAndRenderProp(propName, propValue)
    }

    const dynamicInputs = form.querySelectorAll(".dynamic-input[data-prop-input]")
    dynamicInputs.forEach((dynamicInput) => {
      dynamicInput.addEventListener('input', () => {
        update(dynamicInput)
      });

      // first update
      setTimeout(() => update(dynamicInput), 1000)
    })
  }

  const setupFileInput = () => {
    const MAX_SIZE = 11219617;
    const PARSED_MAX_SIZE = `${parseInt(MAX_SIZE / (1024 ** 2))} MB`
    const VALID_EXTENSIONS = [ "pdf", "doc", "docx" ]

    const inputFile = form.querySelector(".dynamic-input-file")
    const clearFile = inputFile.parentNode.querySelector(".clear-file")
    const buttonFile = inputFile.parentNode.querySelector(".file-button")
    const fileFeedbackMessage = inputFile.parentNode.parentNode.querySelector(".file-feedback-message")

    const resetInputFile = () => {
      updateAndRenderProp("arquivo", "")
      clearFile.className = "clear-file"
      buttonFile.className = "file-button"
      buttonFile.innerText = "Anexar arquivo"
      inputFile.value = ""
      fileFeedbackMessage.className = "file-feedback-message"
      fileFeedbackMessage.innerText = `(.pdf, .doc ou .docx. Limite de ${PARSED_MAX_SIZE})`
    }
    clearFile.addEventListener("click", resetInputFile)

    const handleError = (message) => {
      updateAndRenderProp("arquivo", "")
      fileFeedbackMessage.innerText = message
      fileFeedbackMessage.classList.add("file-feedback-message--error")
      buttonFile.classList.add("file-button--error")
      buttonFile.innerText = "Erro ao anexar"
    } 

    inputFile.addEventListener("change", (e) => {
      if(!inputFile.files.length) {
        return
      }
      const file = inputFile.files[0]

      if(typeof VALID_EXTENSIONS.find((ext) => { 
        return file.name.split('.').pop() === ext; 
      }) === 'undefined'){
        return handleError(`Somente as seguintes extensões são aceitas: ${VALID_EXTENSIONS.join(', ')}. Limite de ${PARSED_MAX_SIZE}.`)
      }

      if (file.size > MAX_SIZE) {
        return handleError(`Tamanho de arquivo permitido excedido. (Máx. ${PARSED_MAX_SIZE})`)
      }
      
      updateAndRenderProp("arquivo", file.name)
      fileFeedbackMessage.innerText = 'Seu arquivo foi anexado com sucesso'
      fileFeedbackMessage.className = "file-feedback-message"
      clearFile.classList.add("clear-file--show")
      buttonFile.className = "file-button file-button--success"
      buttonFile.innerText = "Arquivo anexado"
    })
  }

  const afterRadioButtonChange = (propName, propValue) => {
    if (propName === "assunto") {
      const stepAssunto = form.querySelector(`.${blockName}__step-item[data-step-name=assunto]`)
      const lastStepDot = stepAssunto.querySelector('.step-dots__item:nth-last-child(1)')
      lastStepDot.style.visibility = (propValue === "Imprensa") ? "hidden" : "visible";

      const acceptContact = stepAssunto.querySelector(`.${blockName}__step-item__response__accept-contact`)
      const hiddenAcceptContactClassName = `${blockName}__step-item__response__accept-contact--hidden`
      if(
        propValue === "Relacionamento" || 
        propValue === "Financeiro" ||
        propValue === "Fornecedor"
      ) {
        acceptContact.classList.remove(hiddenAcceptContactClassName)
        acceptContact.querySelectorAll('.accept-contact-checkbox').forEach((checkbox)=>{
          checkbox.disabled = false
        })
      } else {
        acceptContact.classList.add(hiddenAcceptContactClassName)
        acceptContact.querySelectorAll('.accept-contact-checkbox').forEach((checkbox)=>{
          checkbox.disabled = true
        })
      }

      return
    }

    if (propName === 'forma_de_contato') {
      if (propValue === "telefone") {
        return updateCurrentStepInfo({ buttonLabel: "Ver telefone", typeForm: capitalizeFirstLetter(propValue)})
      }

      if (propValue === "chat" || propValue === "whatsapp") {
        return updateCurrentStepInfo({ buttonLabel: "Iniciar conversa", typeForm: capitalizeFirstLetter(propValue)})
      }
      
      return updateCurrentStepInfo({ buttonLabel: "Solicitar contato",typeForm: 'Email'})
    }
  }

  const setupReactiveRadioButtons = () => {
    const update = (radioButton) => {
      if (!radioButton.checked) return
      const propName = radioButton.getAttribute("name")
      const propValue = radioButton.value
      updateAndRenderProp(propName, propValue)
      afterRadioButtonChange(propName, propValue)
    }

    const radioButtons = form.querySelectorAll(`.${blockName}__step-item__response__radio-btn>input[type=radio][name]`)
    radioButtons.forEach((radioButton) => {
      radioButton.addEventListener("click", () => {
        update(radioButton)
      })

      // first update
      setTimeout(() => update(radioButton), 1000)
    })
  }

  const afterSideCheckboxChange = (checkbox) => {
    if(checkbox.getAttribute('data-checkbox-ddi')) {
      const inputTelefone = $('input[name="Telefone"]', form);
      const inputDDI = $('input[name="DDI"]', form);
      inputTelefone.val("")
      inputDDI.val("")
      updateAndRenderProp("telefone", "")
      if (checkbox.checked) {
        inputDDI.prop('disabled', false)
        inputTelefone.mask('999999999999').attr({ minlength: 5, maxlength: 10 });
        updateCurrentStepInfo({ description: "Informe o código do país e o seu número" })
      } else {
        inputDDI.prop('disabled', true);
        inputTelefone.mask(SPMaskBehavior, spOptions).attr({ minlength: 14, maxlength: 15 });
        updateCurrentStepInfo({ description: "Não se esqueça de informar o DDD, tudo bem?" })
      }
    }
  }

  const setupPrefixToggleBySideCheckbox = () => {
    const sideCheckboxes = form.querySelectorAll(`.${blockName}__step-item__response__side-checkbox>input[type='checkbox']`)
    sideCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {  
        const parentResponse = checkbox.closest(`.${blockName}__step-item__response`)
        const prefixInput = parentResponse.querySelector(`.${blockName}__step-item__response__text--prefix`)
        prefixInput.classList.toggle(`${blockName}__step-item__response__text--hidden`)
        afterSideCheckboxChange(checkbox)
      })
    })
  }

  const resetForm = () => {
    setTimeout(() => {
      form.reset();
      propsState.reset()
      const prefixInputs = form.querySelectorAll(`.${blockName}__step-item__response__text--prefix`)
      prefixInputs.forEach((prefixInput) => {
        prefixInput.classList.add(`${blockName}__step-item__response__text--hidden`)
      })
    }, 1000)
  }
  
  const closeForm = () => {
    // resetForm()
    toggleContactUsModal()
    setTimeout(() => {
      goToStepByPosition()
    }, isModal ? 1000 : 0)
  }

  const handleDuplicateMensagemInput = () => {
    const lastStep = stepsHistory[stepsHistory.length - 1]
    if (lastStep === 'fornecedor') return
    const stepFornecedor = form.querySelector(`.${blockName}__step-item[data-step-name=fornecedor]`)
    const fornecedorMensagem = stepFornecedor.querySelector(`.${blockName}__step-item__response__text--textarea`)
    fornecedorMensagem.disabled = true;
    fornecedorMensagem.readOnly = true;
  }

  const handleDuplicateAceitoContatoInput = () => {
    const assunto = propsState["assunto"]
    if(
      assunto === "Relacionamento" || 
      assunto === "Financeiro" ||
      assunto === "Fornecedor"
    ) {
      const stepFormaDeContato = form.querySelector(`.${blockName}__step-item[data-step-name=forma_de_contato]`)
      const acceptContactCheckboxes = stepFormaDeContato.querySelectorAll(`.${blockName}__step-item__response__accept-contact input[type=checkbox]`)
      acceptContactCheckboxes.forEach(checkbox => {
        checkbox.disabled = true;
        checkbox.readOnly = true;
      })
    }
  }

  const enableAllInputs = () => {
    const disabledsElem = form.querySelectorAll(`*[disabled], *[readonly]`)
    disabledsElem.forEach((element) => {
      element.removeAttribute('disabled')
      element.removeAttribute('readonly')
    })
  }

  const submitForm = () => {
    handleDuplicateMensagemInput()
    handleDuplicateAceitoContatoInput()
    const hiddenSubmitButton = form.querySelector(".global-form__hidden-submit")
    hiddenSubmitButton.click()
    submitEvents()
    enableAllInputs()
    submitFormHubSpot(form)
  }

  const submitEvents = () => {
    const type = form?.dataset.tipo
    const empreend = form?.dataset.empreend
    const types = {'mensagem':'Email','whatsapp':'Whatsapp','chat':'Chat','institucional':'Institucional'};
    eventos('Contato', 'Sucesso ' + types[type], empreend);
    window.dataLayer.push ({
      'event': 'Sucesso ' + types[type]
    });

  }

  const submitFormHubSpot = () => {
    const type = form?.dataset.tipo
    const types = {'mensagem':'Email','whatsapp':'Whatsapp','chat':'Chat'};
    const navigation = JSON.parse(atob(cookie.get('hubid_rawref')));
    const empreend = form?.dataset.empreend
    if(types[type] === undefined) return false
    fetch('/domain/lead?Nome='+ form.Nome.value +'&Email='+ form.Email.value +'&Telefone=' + form.Telefone.value + '&id_produto='+ form.id_produto.value + '&empreend=' + empreend + '&title=' + document.title + '&Referencia=' + navigation?.origem + '&ReferenciaRaw=' + encodeURIComponent(navigation?.url) + '&Referrer=' + encodeURIComponent(navigation?.referrer) + '&IP=' + window.ip_client + '&FormConf=' + types[type] + '&Pagina='+ document.location.pathname ?? '')
    .then(function(response) {
      if(response.ok) console.log('Sucesso - HubSpot')
    })
    .catch(function(error) {
      console.log('Erro - HubSpot' + error.message);
    });
  }

  const safetyMails = (value) => {
    if(value.indexOf('teste@teste.com') >= 0)return true 
    if(form.querySelector(`.${blockName}__step-item__response__text--safety`))
      form.querySelector(`.${blockName}__step-item__response__text--safety`).style.display = "block";
    let email = b64EncodeUnicode(value);
    let key = '';
    let ticket = ticketSafetymails();
    return fetch(`https://optin.safetymails.com/main/safetyoptin/${key}/${ticket}/${email}`)
    .then(response => response.json())
    .then(data => 
      {
       emailValido = invalidOptionsSafetymails(data)
       return emailValido;
      }
    );
  }

  const invalidOptionsSafetymails = (data) =>{
    const options = [
      'INVALIDO',
      'ERRO_SINTAXE',
      'SPAMTRAP_POSSIVEL',
      'DOMINIO_INVALIDO'
    ];
    if(form.querySelector(`.${blockName}__step-item__response__text--safety`))
      form.querySelector(`.${blockName}__step-item__response__text--safety`).style.display = "none";
    return options.find(element => element == data.StatusEmail) ? false : true
  }

  const ticketSafetymails = () =>{
    let ticket = ''    
    return ticket;
  }

  const b64EncodeUnicode = (str) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
			function toSolidBytes(match, p1) {
				return String.fromCharCode('0x' + p1);
			}));
  }

  const setupFocusEffectInput = () => {
    const classNameActive = `${blockName}__step-item__response--active`

    const inputs = form.querySelectorAll(`.${blockName}__step-item__response__text`)
    inputs.forEach(input => {
      const parent = input.parentElement;

      input.addEventListener("focusin", () => {
        parent.classList.add(classNameActive)
      })

      input.addEventListener("focusout", () => {
        parent.classList.remove(classNameActive)
      })
    })
  }

  const setupReactiveCheckboxes = () => {
    const update = (checkbox) => {
      const propName = checkbox.getAttribute("name")
      const propValue = checkbox.checked ? "Sim" : "Não"
      updateAndRenderProp(propName, propValue)
      checkbox.value = checkbox.checked ? "Sim" : "Não"
    }

    const checkboxes = form.querySelectorAll(`input[type=checkbox][name]`)
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("click", () => {
        update(checkbox)
      })

      // First update
      setTimeout(() => {
        update(checkbox)
      }, 100)
    })
  }
  const capitalizeFirstLetter = (str) => {
    return str[0].toUpperCase() + str.slice(1);
  }
  
  const onInit = () => {
    setupFocusEffectInput()
    setupReactiveInputs()
    isModal && setupFileInput()
    setupReactiveRadioButtons()
    setupReactiveCheckboxes()
    setupNavigationActions()
    setupPrefixToggleBySideCheckbox()
  }

  return {
    onInit
  }
}
