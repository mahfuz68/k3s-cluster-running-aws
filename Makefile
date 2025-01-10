pulumi:
	curl -fsSL https://get.pulumi.com | sh

ansible_i: 
	sudo apt-get update -y
	sudo apt install software-properties-common -y
	sudo apt-add-repository --yes --update ppa:ansible/ansible
	sudo apt-get install -y ansible 
	sudo ansible --version

playbook:
	ansible-playbook ansible-k3s/playbook.yml

check_i: 
	kubectl get nodes

create_ns:
	kubectl create namespace host-runner

docker_tag: 
	docker tag g_runner>:latest mahfuz1/gc_runner:latest

dokcer_push: 
	docker push mahfuz1/gc_runner:latest

kube_crad: 
	cat /etc/rancher/k3s/k3s.yaml

create_sec:
	kubectl -n host-runner create secret generic github-secret \
		--from-literal=GITHUB_OWNER=mahfuz68 \
		--from-literal=GITHUB_REPOSITORY= \
		--from-literal=GITHUB_PERSONAL_TOKEN=''
	
apply_k8:
	kubectl apply -f github-runner/github-runner.yaml -n host-runner

get_pod:
	kubectl get pods -n host-runner

pod_log:
	kubectl  logs <pod-name> -n host-runner