/*
private createGrid() {
	
	this.gridParent = MRE.Actor.Create(this.context, {
		actor: {
			name: 'grid_parent',
			parentId: this.spawnerParent.id,
			transform: {
				local: { position: new MRE.Vector3(0, 0, 0) }
			},
			appearance: {
				enabled: false
			}
		}
	});

	const lineMat: MRE.Material = this.assets.createMaterial('lineMat', {
		color: new MRE.Color4(0.0, 0.5, 0.0)
	});

	for (let y = 0; y < yGridCells + 1; y++) {
		const yPos = y * (cubeDim / yGridCells) - cubeDim / 2;
		for (let x = 0; x < xGridCells + 1; x++) {
			const xPos = x * (cubeDim / xGridCells) - cubeDim / 2;
			MRE.Actor.Create(this.context, {
				actor: {
					name: 'gridLine' + x + y,
					parentId: this.gridParent.id,
					transform: {
						local: {
							position: new MRE.Vector3(xPos, yPos, 0),
							scale: new MRE.Vector3(0.01, 0.01, cubeDim)
						}
					},
					appearance:
					{
						meshId: this.boxMesh.id,
						materialId: lineMat.id
					},
				}
			});

		}
		for (let z = 0; z < zGridCells + 1; z++) {
			const zPos = z * (cubeDim / zGridCells) - cubeDim / 2;
			MRE.Actor.Create(this.context, {
				actor: {
					name: 'gridLine' + y + z,
					parentId: this.gridParent.id,
					transform: {
						local: {
							position: new MRE.Vector3(0, yPos, zPos),
							scale: new MRE.Vector3(cubeDim, 0.01, 0.01)
						}
					},
					appearance:
					{
						meshId: this.boxMesh.id,
						materialId: lineMat.id
					},
				}
			});
		}
	}

	for (let x = 0; x < xGridCells + 1; x++) {
		const xPos = x * (cubeDim / xGridCells) - cubeDim / 2;
		for (let z = 0; z < zGridCells + 1; z++) {
			const zPos = z * (cubeDim / zGridCells) - cubeDim / 2;

			MRE.Actor.Create(this.context, {
				actor: {
					name: 'vertical_gridLine',
					parentId: this.gridParent.id,
					transform: {
						local: {
							position: new MRE.Vector3(xPos, 0, zPos),
							scale: new MRE.Vector3(0.01, cubeDim, 0.01)
						}
					},
					appearance:
					{
						meshId: this.boxMesh.id,
						materialId: lineMat.id
					},
				}
			});
		}
	}
	MRE.log.info("app", "created all grid components");
}
	*/