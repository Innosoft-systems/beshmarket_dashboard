import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { CredentialsDialog } from "./CredentialsDialog"
import type { IntegrationCredentials } from "@/types/integration"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const CREDS: IntegrationCredentials = {
  login: "bm_semya_a1b2c3",
  secret: "S3cretS3cretS3cretS3cretS3cretS3cretAbCd",
  endpoint_url: "https://api.beshmarket.uz/api/v1/integrations/1c/json",
}

/** Mirrors how ConnectionCard owns the credentials: dropped on close. */
function Host({ initial }: { initial: IntegrationCredentials | null }) {
  const [creds, setCreds] = useState<IntegrationCredentials | null>(initial)
  return <CredentialsDialog credentials={creds} onClose={() => setCreds(null)} />
}

describe("CredentialsDialog", () => {
  it("shows endpoint, login, secret and the one-time warning", () => {
    render(<Host initial={CREDS} />)
    expect(screen.getByText(CREDS.endpoint_url)).toBeInTheDocument()
    expect(screen.getByText(CREDS.login)).toBeInTheDocument()
    expect(screen.getByText(CREDS.secret)).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("Parol faqat hozir ko'rsatiladi")
  })

  it("removes the secret from the page when closed", async () => {
    const user = userEvent.setup()
    render(<Host initial={CREDS} />)
    await user.click(screen.getByRole("button", { name: "Saqlab oldim, yopish" }))
    expect(screen.queryByText(CREDS.secret)).not.toBeInTheDocument()
    expect(document.body.innerHTML).not.toContain(CREDS.secret)
  })

  it("Escape does not close it (the secret can't be lost by accident)", async () => {
    const user = userEvent.setup()
    render(<Host initial={CREDS} />)
    await user.keyboard("{Escape}")
    expect(screen.getByText(CREDS.secret)).toBeInTheDocument()
  })

  it("copies a value to the clipboard", async () => {
    const user = userEvent.setup()
    const writeText = jest.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
    render(<Host initial={CREDS} />)
    await user.click(screen.getByRole("button", { name: "Parolni nusxalash" }))
    expect(writeText).toHaveBeenCalledWith(CREDS.secret)
    expect(toast.success).toHaveBeenCalledWith("Parol nusxalandi")
  })

  it("renders nothing without credentials", () => {
    render(<Host initial={null} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
