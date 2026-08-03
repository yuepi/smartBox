import { onMounted } from 'vue';

import gsap from 'gsap';

export const useLoginAnimation = (containerSelector: string) => {
  onMounted(() => {
    // 等待 DOM 渲染完成
    setTimeout(() => {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { ease: 'power3.out', duration: 0.8 },
        });

        // 卡片入场：淡入 + 上浮
        tl.to(containerSelector, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power4.out',
        })
          // 表单输入框逐个淡入（利用 Vben 生成的类名）
          .fromTo(
            '.vben-input__wrapper, .vben-input-password__wrapper, .slider-captcha',
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, stagger: 0.12, duration: 0.6 },
            '-=0.4',
          )
          // 按钮弹性入场
          .fromTo(
            '.vben-button',
            { scale: 0.92, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2)' },
            '-=0.2',
          )
          // 底部链接（记住密码、忘记密码、第三方登录）
          .fromTo(
            '.vben-checkbox, .vben-link, .third-party-login',
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, stagger: 0.08, duration: 0.5 },
            '-=0.3',
          );
      });

      return () => ctx.revert();
    }, 100);
  });
};
