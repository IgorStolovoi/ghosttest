const swiper = new Swiper('.swiper', {
    loop: true,
    disableOnInteraction: false,
    speed: 1500,
    spaceBetween: 20,
    autoplay: {
        delay: 5000,
    },
    pagination: {
        el: '.swiper-pagination',
        clickable: true
    },

});