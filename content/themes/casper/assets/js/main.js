document.addEventListener('DOMContentLoaded', () => {

    // Start registration popup handling

    const headerSigninButton = document.querySelector('#gh-head-signin-button');
    const headerRegistrationButton = document.querySelector('#gh-head-registration-button');
    const registrationPopup = document.querySelector('.registration-substrate-layer');
    const signinPopup = document.querySelector('.signin-substrate-layer');

    const registrationPopupCloseButton = document.querySelector('#registration-popup-close-button');
    const signinPopupCloseButton = document.querySelector('#signin-popup-close-button');

    const bodyElement = document.querySelector('body');

    const actionPopupClass = 'open';
    const actionBodyClass = 'hidden-scroll';

    const addClass = (element, activeClass) => {
        element.classList.add(activeClass);
    };

    const removeClass = (element, activeClass) => {
        element.classList.remove(activeClass);
    };

    const openRegistrationPopup = (event, element, activeClass) => {
        event.stopPropagation();
        addClass(element, activeClass);
        addClass(bodyElement, actionBodyClass);
    };

    const closeRegistrationPopup = (event, element, activeClass, closeButton) => {
        event.stopPropagation();
        if (event.target === element || event.target === closeButton) {
            removeClass(element, activeClass);
            removeClass(bodyElement, actionBodyClass);
        }
    };


    if (headerSigninButton && headerRegistrationButton) {
        headerRegistrationButton.addEventListener('click', (event) => {
            openRegistrationPopup(event, registrationPopup, actionPopupClass);
        });

        registrationPopup.addEventListener('click', (event) => {
            closeRegistrationPopup(event, registrationPopup, actionPopupClass, registrationPopupCloseButton);
        });

        headerSigninButton.addEventListener('click', (event) => {
            openRegistrationPopup(event, signinPopup, actionPopupClass);
        });

        signinPopup.addEventListener('click', (event) => {
            closeRegistrationPopup(event, signinPopup, actionPopupClass, signinPopupCloseButton);
        });
    }

    // End registration popup handling

    // Start google auth

    const googleAuth = async () => {
        try {
            const res = await fetch('http://proit.frontend.zeus.nixdev.co/members/api/auth/google/signup', { mode: 'cors' });
            console.log(res);
            if (res.ok) {
                console.log('res ok');
                console.log(res);
            } else {
                console.log('res error');
                console.log(res);
            }
        } catch (error) {
            console.log('just error');
            console.log(error);
        }
    }

    const googleAuthButton = document.querySelector('#google-registration');

    if (googleAuthButton) {
        googleAuthButton.addEventListener('click', googleAuth);
    }


    // End google auth

    //  Start member popup handling

    const headerMemberButton = document.querySelector('#header-member-button');
    const headerMemberPopup = document.querySelector('#header-member-popup');
    const headerMemberLinks = document.querySelectorAll('.gh-head-member-popup-link');
    const additionalActionMemberClass = 'open';

    const openMemberPopup = () => {
        addClass(headerMemberButton, additionalActionMemberClass);
        addClass(headerMemberPopup, additionalActionMemberClass);
    };

    const closeMemberPopup = () => {
        removeClass(headerMemberButton, additionalActionMemberClass);
        removeClass(headerMemberPopup, additionalActionMemberClass);
    };

    const closeMemberPopupByClickOutside = (event) => {
        if (event.target !== headerMemberButton) {
            closeMemberPopup();
        }
    };

    const handleHeaderMemberButtonClick = () => {
        const hasPopupActionClass = headerMemberButton.classList.contains(additionalActionMemberClass);
        if (hasPopupActionClass) {
            closeMemberPopup();
        } else {
            openMemberPopup();
        }
    }

    if (headerMemberButton) {

        document.addEventListener('click', closeMemberPopupByClickOutside);

        headerMemberButton.addEventListener('click', handleHeaderMemberButtonClick);
    }

    //  End member popup handling

    //  Start changing placeholder in the search popup

    const targetPopupContainer = document.querySelector('#sodo-search-root');
    const searchIframeStyles = document.createElement('style');
    searchIframeStyles.setAttribute('type', 'text/css');
    searchIframeStyles.innerHTML = `
    body h1 {
        display: none;
    }
    body .py-4.px-7 p {
        color: transparent;
        position: relative;
    }
    body .py-4.px-7 p::before {
       content: "Немає результатів";
       color: #000000;
       display: inline-block;
       position: absolute;
       left: 10px;
       top: 50%;
       transform: translateY(-50%);
    }`;

    const setTranslationsInPortalSearch = () => {
        const searchIframe = document.querySelector('iframe[title="portal-popup"]');
        if (searchIframe) {
            searchIframe.addEventListener('load', () => {
                const searchIframeDoc = searchIframe.contentDocument || searchIframe.contentWindow.document;
                const iframeHead = searchIframeDoc.head;
                iframeHead.append(searchIframeStyles);
                const searchInput = searchIframeDoc.body.querySelector('input');
                searchInput.placeholder = "Пошук...";
            });

        }
    }

    const mutationObserverConfig = { childList: true };
    const mutationCallback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.type === "childList") {
                setTranslationsInPortalSearch();
            }
        }
    }
    const iframeMutationObserver = new MutationObserver(mutationCallback);
    iframeMutationObserver.observe(targetPopupContainer, mutationObserverConfig);


    //  End changing placeholder in the search popup

    // Start removing ghost default signup

    const removingDefaultPortalPopup = () => {
        const defaultGhostPortal = document.querySelector('#ghost-portal-root');

        if (defaultGhostPortal) {
            // defaultGhostPortal.style.display = "none";
            defaultGhostPortal.remove();
        }
    }

    // End removing ghost default signup

    setTranslationsInPortalSearch();
    removingDefaultPortalPopup();
});

