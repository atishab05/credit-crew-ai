# CreditCrew AI — developer and IDBI team helpers.
DATE ?= $(shell date +%Y%m%d)
ZIP  ?= creditcrew-idbi-handover-$(DATE).zip
DEST ?= /mnt/documents

TF_DIR   := terraform
TF_ENVS  := dev uat prod

# Resolve path to the terraform binary; override with TF=<path> if needed.
TF ?= terraform

.PHONY: help zip clean \
        tf-fmt tf-fmt-check \
        tf-init-dev   tf-init-uat   tf-init-prod \
        tf-validate-dev tf-validate-uat tf-validate-prod tf-validate \
        tf-plan-dev   tf-plan-uat   tf-plan-prod \
        tf-fmt-validate-dev tf-fmt-validate-uat tf-fmt-validate-prod tf-fmt-validate

# ── Help ─────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "CreditCrew AI — Makefile targets"
	@echo ""
	@echo "  Handover"
	@echo "    make zip              Bundle terraform/, docker/, .github/, docs/ → $(DEST)/$(ZIP)"
	@echo "    make clean            Remove local zip artefacts"
	@echo ""
	@echo "  Terraform — formatting"
	@echo "    make tf-fmt           Rewrite all .tf files in-place (terraform fmt -recursive)"
	@echo "    make tf-fmt-check     Check formatting without writing (exit 1 if dirty)"
	@echo ""
	@echo "  Terraform — per-environment (ENV = dev | uat | prod)"
	@echo "    make tf-init-<ENV>    terraform init for the given environment workspace"
	@echo "    make tf-validate-<ENV> terraform validate against envs/<ENV>.tfvars"
	@echo "    make tf-plan-<ENV>    terraform plan against envs/<ENV>.tfvars (no apply)"
	@echo "    make tf-fmt-validate-<ENV>  fmt-check + validate in one step"
	@echo ""
	@echo "  Terraform — all environments at once"
	@echo "    make tf-validate      Run validate for dev, uat, prod sequentially"
	@echo "    make tf-fmt-validate  Run fmt-check + validate for all three"
	@echo ""

# ── Handover ─────────────────────────────────────────────────────────────────

zip:
	@mkdir -p $(DEST)
	@rm -f $(DEST)/$(ZIP)
	@zip -r $(DEST)/$(ZIP) \
		terraform \
		docker \
		.github/workflows/deploy.yml \
		docs \
		README.md 2>/dev/null || true
	@echo "Wrote $(DEST)/$(ZIP)"

clean:
	@rm -f $(DEST)/creditcrew-idbi-handover-*.zip

# ── Terraform — formatting ────────────────────────────────────────────────────

tf-fmt:
	$(TF) -chdir=$(TF_DIR) fmt -recursive
	@echo "✔  terraform fmt applied"

tf-fmt-check:
	$(TF) -chdir=$(TF_DIR) fmt -recursive -check -diff
	@echo "✔  terraform fmt check passed"

# ── Terraform — init (per environment) ───────────────────────────────────────
# Runs terraform init and selects (or creates) the matching workspace.
# Re-running is safe: -upgrade refreshes provider locks; -reconfigure tolerates
# a changed backend address.

tf-init-dev:
	$(TF) -chdir=$(TF_DIR) init -upgrade -reconfigure
	$(TF) -chdir=$(TF_DIR) workspace select dev 2>/dev/null || \
	    $(TF) -chdir=$(TF_DIR) workspace new dev

tf-init-uat:
	$(TF) -chdir=$(TF_DIR) init -upgrade -reconfigure
	$(TF) -chdir=$(TF_DIR) workspace select uat 2>/dev/null || \
	    $(TF) -chdir=$(TF_DIR) workspace new uat

tf-init-prod:
	$(TF) -chdir=$(TF_DIR) init -upgrade -reconfigure
	$(TF) -chdir=$(TF_DIR) workspace select prod 2>/dev/null || \
	    $(TF) -chdir=$(TF_DIR) workspace new prod

# ── Terraform — validate (per environment) ───────────────────────────────────
# validate does not contact AWS — it only checks syntax and internal consistency.
# It requires a successful init first.

tf-validate-dev: tf-init-dev
	$(TF) -chdir=$(TF_DIR) validate
	@echo "✔  terraform validate passed (dev)"

tf-validate-uat: tf-init-uat
	$(TF) -chdir=$(TF_DIR) validate
	@echo "✔  terraform validate passed (uat)"

tf-validate-prod: tf-init-prod
	$(TF) -chdir=$(TF_DIR) validate
	@echo "✔  terraform validate passed (prod)"

tf-validate: tf-validate-dev tf-validate-uat tf-validate-prod
	@echo "✔  terraform validate passed for all environments"

# ── Terraform — plan (per environment) ───────────────────────────────────────
# Contacts AWS; requires credentials in the environment.
# Writes the plan binary to /tmp so it can be passed to `terraform apply` later.

tf-plan-dev: tf-init-dev
	$(TF) -chdir=$(TF_DIR) plan \
	    -var-file=envs/dev.tfvars \
	    -out=/tmp/creditcrew-dev.tfplan
	@echo "✔  plan written to /tmp/creditcrew-dev.tfplan"

tf-plan-uat: tf-init-uat
	$(TF) -chdir=$(TF_DIR) plan \
	    -var-file=envs/uat.tfvars \
	    -out=/tmp/creditcrew-uat.tfplan
	@echo "✔  plan written to /tmp/creditcrew-uat.tfplan"

tf-plan-prod: tf-init-prod
	$(TF) -chdir=$(TF_DIR) plan \
	    -var-file=envs/prod.tfvars \
	    -out=/tmp/creditcrew-prod.tfplan
	@echo "✔  plan written to /tmp/creditcrew-prod.tfplan"

# ── Terraform — combined fmt-check + validate (per environment / all) ────────

tf-fmt-validate-dev: tf-fmt-check tf-validate-dev
	@echo "✔  fmt-check + validate passed (dev)"

tf-fmt-validate-uat: tf-fmt-check tf-validate-uat
	@echo "✔  fmt-check + validate passed (uat)"

tf-fmt-validate-prod: tf-fmt-check tf-validate-prod
	@echo "✔  fmt-check + validate passed (prod)"

tf-fmt-validate: tf-fmt-check tf-validate
	@echo "✔  fmt-check + validate passed for all environments"
