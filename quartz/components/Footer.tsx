import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/footer.scss"
import { version } from "../../package.json"
import { i18n } from "../i18n"

interface Options {
  links: Record<string, string>
}

export default ((opts?: Options) => {
  const Footer: QuartzComponent = ({ displayClass, cfg }: QuartzComponentProps) => {
    const year = new Date().getFullYear()
    const links = opts?.links ?? []
    return (
      <footer class={displayClass ?? ""}>
        <div class="footer-sections">
          <section class="script-card script-section">
            <h2>Как установить</h2>
            <ul class="feature-list">
              <li>
                Установите менеджер пользовательских скриптов —{" "}
                <a
                  href="https://violentmonkey.github.io/get-it/"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Violentmonkey
                </a>{" "}
                или{" "}
                <a href="https://www.tampermonkey.net/" target="_blank" rel="noreferrer noopener">
                  Tampermonkey
                </a>
                .
              </li>
              <li>
                Нажмите кнопку «Установить скрипт» на нужной странице и подтвердите установку в
                появившемся окне.
              </li>
              <li>
                Перезагрузите вкладку с <code>GWars</code>. Обновления прилетают автоматически.
              </li>
            </ul>
          </section>

          <section class="script-card support-card">
            <p>
              Нужен другой скрипт или нашли баг?{" "}
              <a
                href="https://www.gwars.io/sms-chat.php?id=339736"
                target="_blank"
                rel="noreferrer noopener"
              >
                Напишите мне
              </a>
              , придумаем решение.
            </p>
          </section>
        </div>

      </footer>
    )
  }

  Footer.css = style
  return Footer
}) satisfies QuartzComponentConstructor
