import { Component, OnInit, OnDestroy, HostListener, NgZone, computed, inject, signal, WritableSignal, effect, untracked, Injector } from '@angular/core'; // Import effect, untracked, Injector
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SplitButtonModule } from 'primeng/splitbutton';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadEvent, FileUploadModule } from 'primeng/fileupload';
import {
    DragDropModule,
    CdkDragDrop,
    moveItemInArray,
} from '@angular/cdk/drag-drop';
// ----- VOS CLASSES -----
import { Block } from '../../classes/Block';
import { ParagraphBlock } from '../../classes/ParagraphBlock';
import { ModuleVersion } from '../../classes/ModuleVersion';
import { ModuleResponse } from '../../classes/ModuleResponse';
import { MusicBlock } from '../../classes/MusicBlock';
import { IntegratedModuleBlock } from '../../classes/IntegratedModuleBlock';
import { GameSystem } from '../../classes/GameSystem';
import { ModuleRequest } from '../../classes/ModuleRequest';
// ----- VOS ENUMS -----
import { EBlockType } from '../../enum/BlockType';
import { EModuleType } from '../../enum/ModuleType';
// ----- VOS SERVICES -----
import { UserHttpService } from '../../services/https/user-http.service';
import { BlockHttpService } from '../../services/https/block-http.service';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { ModuleVersionHttpService } from '../../services/https/module-version-http.service';
import { GameSystemHttpService } from '../../services/https/game-system-http.service';
// ----- MODULES ANGULAR/PRIMENG -----
import { FloatLabelModule } from 'primeng/floatlabel';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import aleaRNGFactory from "number-generator/lib/aleaRNGFactory";
import { TabsModule } from 'primeng/tabs';
import { SelectChangeEvent, SelectModule } from 'primeng/select';
import { StatBlock } from '../../classes/StatBlock';
import { CommonModule } from '@angular/common';

// --- Interface Position ---
interface Position {
    x: number;
    y: number;
}

@Component({
    selector: 'app-new-project',
    standalone: true,
    imports: [
        CommonModule,
        TabsModule,
        FormsModule,
        ButtonModule,
        SplitButtonModule,
        InputTextModule,
        DragDropModule,
        TextareaModule,
        FileUploadModule,
        FloatLabelModule,
        TranslateModule,
        SelectModule
    ],
    templateUrl: './new-project.component.html',
    styleUrl: './new-project.component.scss'
})
export class NewProjectComponent implements OnInit, OnDestroy {
    // --- Injections ---
    private userService = inject(UserHttpService);
    private blockHttpService = inject(BlockHttpService);
    private moduleHttpService = inject(ModuleHttpService);
    private moduleVersionHttpService = inject(ModuleVersionHttpService);
    private gameSystemHttpService = inject(GameSystemHttpService);
    private ngZone = inject(NgZone);
    private injector = inject(Injector); // Inject Injector for effect cleanup

    // --- Enums ---
    enumBlockType = EBlockType

    // --- Properties & Signals ---
    items: MenuItem[] | undefined;
    uploadedFiles: File[] = [];
    blocks: WritableSignal<Block[]> = signal([]);
    availableBlocks: Block[] = []; // Keep as regular array if definition doesn't change
    currentModule: WritableSignal<ModuleResponse> = signal(new ModuleResponse());
    currentModuleVersion: WritableSignal<ModuleVersion> = signal(new ModuleVersion());
    currentUser = computed(() => this.userService.currentJdrUser());
    currentGameSystem: WritableSignal<GameSystem | undefined> = signal(undefined);
    gameSystems = signal<GameSystem[]>([]);

    isDraggingIcon = signal(false); // Use signal for boolean flags
    draggedIconType: EBlockType | null = null;
    activeIconElement: HTMLElement | null = null;
    dragPosition: Position = { x: 0, y: 0 };
    isOverDropZone = signal(false); // Use signal
    dropZoneElement: HTMLElement | null = null;
    initialSetupDone = signal(false); // Flag to run user-dependent setup only once

    constructor() {
        // Effect to handle setup once user is available
        effect(() => {
            const user = this.currentUser(); // Depend on currentUser signal
            console.log('Effect triggered. User:', user, 'Setup done:', this.initialSetupDone());

            // Check if user exists AND setup hasn't run yet
            if (user && !this.initialSetupDone()) {
                console.log('User available, performing initial setup...');
                // Run setup logic within untracked if it reads other signals
                // that shouldn't re-trigger this effect (like gameSystems)
                untracked(() => {
                    // Initialize module and version now that user is available
                    const defaultGameSystemId = this.currentGameSystem()?.id ?? 1; // Read current game system ID
                    this.currentModule.set(new ModuleResponse(0, 'New Module', 'Description', EModuleType.Scenario, user));
                    this.currentModuleVersion.set(new ModuleVersion(
                        0, 1, user, defaultGameSystemId, false
                    ));

                    // Setup available blocks (can now use the real user object)
                    const tempModuleVersionId = 0; // Placeholder ID
                    this.availableBlocks = [ // Assign directly
                        new ParagraphBlock(tempModuleVersionId, 'Preview Paragraphe', 0, user),
                        new MusicBlock(tempModuleVersionId, 'Preview Musique', 1, user),
                        new StatBlock(tempModuleVersionId, 'Preview Stats', 2, user),
                        new IntegratedModuleBlock(tempModuleVersionId, 'Preview Module Intégré', 3, user)
                    ];

                    // Add the initial block
                    this.addBlock(EBlockType.paragraph);

                    // Mark setup as done
                    this.initialSetupDone.set(true);
                    console.log('Initial setup complete. Blocks:', this.blocks());
                });
            } else if (!user && this.initialSetupDone()) {
                 // Optional: Reset if user logs out after setup was done
                 console.log('User logged out or became null after setup.');
                 this.initialSetupDone.set(false); // Allow setup again if user logs back in
                 this.blocks.set([]); // Clear blocks
                 this.currentModule.set(new ModuleResponse()); // Reset module
                 this.currentModuleVersion.set(new ModuleVersion()); // Reset version
            }
        }, { injector: this.injector }); // Pass injector for automatic cleanup
    }

    async ngOnInit() {
        // Load things that DON'T depend on the user object being immediately available
        console.log('ngOnInit: Loading game systems...');
        try {
            const systems = await this.gameSystemHttpService.getAllGameSystems();
            this.gameSystems.set(systems);
            const defaultGameSystem = systems.length > 0 ? systems[0] : undefined;
            this.currentGameSystem.set(defaultGameSystem);
            console.log('Game systems loaded. Default:', defaultGameSystem);
        } catch (error) {
            console.error("Error loading game systems:", error);
            // Handle error appropriately
        }

        this.items = [{ label: 'Delete', icon: 'pi pi-times' }];
        // Use ngZone.runOutsideAngular for setting up the drop zone element listener
        // to potentially avoid unnecessary change detection cycles.
        this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
                this.dropZoneElement = document.getElementById('blocksList');
                 console.log('Drop zone element set:', this.dropZoneElement);
            }, 0);
        });
        console.log('ngOnInit complete.');
        // User-dependent setup is now handled by the effect
    }

    ngOnDestroy() {
        // Cleanup listeners if they weren't automatically cleaned up
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        console.log('Component destroyed, listeners removed.');
    }

    // --- Drag & Drop Methods ---
    startIconDrag(event: Event, iconType: EBlockType) {
        event.preventDefault();
        if (this.isDraggingIcon()) return; // Prevent starting drag if already dragging

        let clientX = 0, clientY = 0;
        if (event instanceof MouseEvent) {
            clientX = event.clientX; clientY = event.clientY;
        } else if (event.target) {
            const rect = (event.target as HTMLElement).getBoundingClientRect();
            clientX = rect.left + rect.width / 2; clientY = rect.top + rect.height / 2;
        }
        this.isDraggingIcon.set(true); // Use signal
        this.draggedIconType = iconType;
        this.dragPosition = { x: clientX, y: clientY };
        if (event.target) {
            this.activeIconElement = (event.target as HTMLElement).closest('.icon-item');
            this.activeIconElement?.classList.add('active-drag');
        }
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
        console.log('Drag started:', iconType);
    }

    @HostListener('document:mousemove', ['$event']) onMouseMove = (event: MouseEvent) => {
        if (!this.isDraggingIcon()) return;
        // Use ngZone run only if absolutely necessary for updating UI outside Angular zone tasks
        this.dragPosition = { x: event.clientX, y: event.clientY };
        this.checkIfOverDropZone(event);
    }

    @HostListener('document:mouseup', ['$event']) onMouseUp = (event: MouseEvent) => {
        if (!this.isDraggingIcon()) return;
        console.log('Mouse up event');
        // Use ngZone.run to ensure updates are within Angular's zone if needed
        this.ngZone.run(() => {
            if (this.isOverDropZone()) {
                const insertPosition = this.calculateInsertPosition(event);
                console.log('Dropping icon at position:', insertPosition);
                this.addBlock(this.draggedIconType || EBlockType.paragraph, insertPosition);
            } else {
                 console.log('Dropped outside zone.');
            }
            this.endIconDrag();
        });
    }

    endIconDrag() {
        if (!this.isDraggingIcon()) return; // Prevent multiple calls
        this.isDraggingIcon.set(false);
        this.draggedIconType = null;
        this.isOverDropZone.set(false); // Reset drop zone flag
        if (this.activeIconElement) {
            this.activeIconElement.classList.remove('active-drag');
            this.activeIconElement = null;
        }
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        console.log('Drag ended.');
    }

    checkIfOverDropZone(event: MouseEvent) {
        if (!this.dropZoneElement) {
            this.isOverDropZone.set(false);
            return;
        };
        const rect = this.dropZoneElement.getBoundingClientRect();
        const isOver = (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom);
        if (isOver !== this.isOverDropZone()) {
            this.isOverDropZone.set(isOver); // Update signal only on change
             console.log('Is over drop zone:', isOver);
        }
    }
    calculateInsertPosition(event: MouseEvent): number {
      const currentBlocks = this.blocks();
      if (!this.dropZoneElement) return currentBlocks.length;
      const blockElements = Array.from(this.dropZoneElement.querySelectorAll('.block-container:not(.cdk-drag-preview):not(.cdk-drag-placeholder)')); // Exclude helper elements
      if (blockElements.length === 0) return 0;

      // Find the element we are hovering over or closest to
      let closestIndex = currentBlocks.length; // Default to end
      let smallestDistance = Infinity;

      blockElements.forEach((element, index) => {
         const blockRect = element.getBoundingClientRect();
         const elementMidY = blockRect.top + blockRect.height / 2;
         const distance = Math.abs(event.clientY - elementMidY);

         // Simple check: if mouse is above the middle of the element
         if (event.clientY < elementMidY && index < closestIndex) {
              // If the mouse is above the vertical midpoint, potential insert index is 'index'
              // This part needs refinement maybe based on distance
         }

         // Alternative: find the element whose midpoint is closest to the mouse Y
         if (distance < smallestDistance) {
            smallestDistance = distance;
            // If mouse is above the closest midpoint, insert before; otherwise, insert after
            closestIndex = (event.clientY < elementMidY) ? index : index + 1;
         }
      });

      // Refined logic based on boundaries
      for (let i = 0; i < blockElements.length; i++) {
          const blockRect = blockElements[i].getBoundingClientRect();
          // If the mouse Y is within the bounds of this element
          if (event.clientY >= blockRect.top && event.clientY <= blockRect.bottom) {
              const blockMiddle = blockRect.top + blockRect.height / 2;
              return (event.clientY < blockMiddle) ? i : i + 1;
          }
          // If the mouse Y is between this element and the next one (or above the first/below the last)
          if (i === 0 && event.clientY < blockRect.top) return 0; // Above first element
          if (i < blockElements.length - 1) {
              const nextBlockRect = blockElements[i+1].getBoundingClientRect();
              if (event.clientY > blockRect.bottom && event.clientY < nextBlockRect.top) {
                  return i + 1; // Between elements
              }
          } else if (event.clientY > blockRect.bottom) {
              return blockElements.length; // Below last element
          }
      }


      return closestIndex; // Fallback to closest index logic if boundary logic fails
    }

    geticonByType(type: EBlockType): string | undefined {
      switch (type) {
        case EBlockType.paragraph: return 'pi pi-align-left'; // Changed icon
        case EBlockType.music: return 'pi pi-volume-up'; // Changed icon
        case EBlockType.module: return 'pi pi-book'; // Changed icon
        case EBlockType.stat: return 'pi pi-chart-bar';
        default: return 'pi pi-question-circle'; // Default icon
      }
    }

    // --- Block Management Methods ---
    addBlock(type: EBlockType, position?: number) {
        const user = this.currentUser();
        if (!user) {
            console.error("Cannot add block: user not available.");
            return;
        }

        let newBlock: Block | null = null;
        const currentVersionId = this.currentModuleVersion()?.id ?? 0;
        const currentBlockArray = this.blocks();
        const blockOrder = position !== undefined ? position : currentBlockArray.length;
        const blockPreviewTitle = this.getBlockPreview(type) ?? 'Nouveau Bloc'; // Use preview or default

        console.log(`Adding block of type ${type} at position ${blockOrder}`);

        switch (type) {
            case EBlockType.paragraph:
                newBlock = new ParagraphBlock(currentVersionId, blockPreviewTitle, blockOrder, user);
                break;
            case EBlockType.module:
                newBlock = new IntegratedModuleBlock(currentVersionId, blockPreviewTitle, blockOrder, user);
                break;
            case EBlockType.music:
                newBlock = new MusicBlock(currentVersionId, blockPreviewTitle, blockOrder, user);
                break;
            case EBlockType.stat:
                 newBlock = new StatBlock(currentVersionId, blockPreviewTitle, blockOrder, user);
                 break;
            default:
                console.warn(`Block type ${type} not handled in addBlock`);
                return;
        }

        // Assign a temporary frontend ID
        newBlock.id = aleaRNGFactory(2425225252).uInt32();

        const newBlocks = [...currentBlockArray]; // Create new array reference

        if (position !== undefined) {
            newBlocks.splice(position, 0, newBlock);
        } else {
            newBlocks.push(newBlock);
        }
        // Update order for all blocks in the new array
        newBlocks.forEach((block, index) => {
            block.blockOrder = index;
        });

        this.blocks.set(newBlocks); // Update the signal
        console.log('Blocks after adding:', this.blocks());
    }

    removeBlock(blockId: number) {
        const currentBlocks = this.blocks();
        const index = currentBlocks.findIndex(block => block.id === blockId);
        if (index !== -1) {
            console.log(`Removing block with ID: ${blockId} at index ${index}`);
            const newBlocks = currentBlocks.filter(block => block.id !== blockId);
            // Update order after removal
            newBlocks.forEach((block, idx) => {
                block.blockOrder = idx;
            });
            this.blocks.set(newBlocks);
             console.log('Blocks after removing:', this.blocks());
        } else {
            console.warn(`Block with ID ${blockId} not found for removal.`);
        }
    }

    onDrop(event: CdkDragDrop<Block[]>) {
        console.log(`Block dropped from index ${event.previousIndex} to ${event.currentIndex}`);
        const currentBlocks = [...this.blocks()]; // Clone the array
        moveItemInArray(currentBlocks, event.previousIndex, event.currentIndex);
        // Update order after drop
        currentBlocks.forEach((block, index) => {
            block.blockOrder = index;
        });
        this.blocks.set(currentBlocks); // Update the signal
         console.log('Blocks after drop:', this.blocks());
    }

    getBlockPreview(type: EBlockType): string | undefined {
        switch (type) {
            case EBlockType.paragraph: return 'Bloc Paragraphe';
            case EBlockType.music: return 'Bloc Audio';
            case EBlockType.module: return 'Bloc Module';
            case EBlockType.stat: return 'Bloc Statistique'; // Corrected typo
            default: return undefined;
        }
    }

    onUpload(event: FileUploadEvent) {
        for (const file of event.files) {
            this.uploadedFiles.push(file);
        }
         console.log('Files uploaded:', this.uploadedFiles);
        // TODO: Handle the uploaded files (e.g., associate with a block)
    }

    // --- Save Method (Upsert Logic) ---
    async save() {
      const user = this.currentUser();
      if (!user) {
        console.error("Cannot save module, user is not logged in.");
        // TODO: Add user feedback (e.g., messageService.add)
        return;
      }

      console.log("Save process started...");

      try {
        let savedModuleResponse: ModuleResponse;
        let moduleVersionForBlocks: ModuleVersion | undefined;

        // Ensure GameSystem ID is set in the version object before saving
        this.currentModuleVersion.update(version => {
            const currentSystemId = this.currentGameSystem()?.id;
             // Only update if currentSystemId is valid, otherwise keep existing or default
            version.gameSystemId = typeof currentSystemId === 'number' ? currentSystemId : (version.gameSystemId ?? 1);
            console.log(`Version to save/update - GameSystem ID: ${version.gameSystemId}`);
            return version;
        });

        // Determine if we are creating or updating the module
        const existingModuleId = this.currentModule()?.id; // Use optional chaining

        if (existingModuleId && existingModuleId > 0) {
          // --- UPDATE PATH ---
          console.log(`Updating existing module with ID: ${existingModuleId}`);
          const moduleToUpdate = new ModuleRequest(
            this.currentModule().title,
            this.currentModule().description,
            this.currentModule().isTemplate,
            this.currentModule().type,
            user // Creator might not be needed/used for update depending on backend
          );
          savedModuleResponse = await this.moduleHttpService.updateModule(existingModuleId, moduleToUpdate);
          this.currentModule.set(savedModuleResponse); // Update local module state

          // Assume we are updating the existing version held in currentModuleVersion
          const existingVersionId = this.currentModuleVersion()?.id; // Use optional chaining
          if (existingVersionId && existingVersionId > 0) {
            console.log(`Updating existing module version with ID: ${existingVersionId}`);
            const versionToSend = this.currentModuleVersion();
            // Ensure IDs are correct before sending
            versionToSend.moduleId = existingModuleId;
            versionToSend.id = existingVersionId;
            moduleVersionForBlocks = await this.moduleVersionHttpService.updateModuleVersion(existingVersionId, versionToSend);
            this.currentModuleVersion.set(moduleVersionForBlocks); // Update local version state
            console.log("Module and Version updated successfully.");
          } else {
            console.error("Module exists but local version ID is missing or invalid. Cannot update version.");
            // TODO: Handle error - inform user? Attempt recovery?
            return; // Stop the process
          }

        } else {
          // --- CREATE PATH ---
          console.log("Creating new module.");
          const moduleToCreate = new ModuleRequest(
            this.currentModule().title,
            this.currentModule().description,
            this.currentModule().isTemplate,
            this.currentModule().type,
            user
          );
          savedModuleResponse = await this.moduleHttpService.createModule(moduleToCreate);
          this.currentModule.set(savedModuleResponse); // Update local module state with backend ID etc.
          console.log("Module created with ID:", savedModuleResponse.id);

          // Extract the first version created by the backend
          if (savedModuleResponse.versions && savedModuleResponse.versions.length > 0) {
            const firstVersionDTO = savedModuleResponse.versions[0];
             console.log("First version DTO from backend:", firstVersionDTO);
             if(!firstVersionDTO.id) {
                console.error("Backend did not return a valid ID for the created version.");
                return; // Stop if version ID is missing
             }
            moduleVersionForBlocks = new ModuleVersion(
              firstVersionDTO.moduleId, firstVersionDTO.version, user, // Use the local user object
              firstVersionDTO.gameSystemId ?? 1, // Use backend value or default
              firstVersionDTO.published, firstVersionDTO.createdAt,
              firstVersionDTO.updatedAt, firstVersionDTO.language, firstVersionDTO.id
            );
            this.currentModuleVersion.set(moduleVersionForBlocks); // Update local version state
            console.log("Initial Version set with ID:", moduleVersionForBlocks.id);
          } else {
            console.error("Backend did not return any module versions after creation.");
            // TODO: Handle error
            return; // Stop the process
          }
        }

        // --- BLOCK HANDLING (Common for Create and Update) ---
        const currentVersionId = moduleVersionForBlocks?.id;
        if (currentVersionId && currentVersionId > 0) {
          console.log("Processing blocks for version ID:", currentVersionId);
          const currentBlocks = this.blocks();

          // Separate blocks into new and existing based on ID presence/validity
          const blocksToCreate: Block[] = [];
          const blocksToUpdate: Block[] = [];

          currentBlocks.forEach(block => {
              block.moduleVersionId = currentVersionId; // Assign correct version ID first
              // Refined check: Assumes backend IDs are numbers > 0. Temporary IDs might be different.
              if (block.id && typeof block.id === 'number' && block.id > 0) {
                  blocksToUpdate.push(block);
              } else {
                  // It's a new block or has a temporary ID
                  // Prepare for creation (remove temporary ID if necessary for backend)
                  const createData = { ...block };
                  // delete createData.id; // Uncomment if backend POST expects no ID
                  blocksToCreate.push(createData as Block);
              }
          });

          console.log(`Blocks to create: ${blocksToCreate.length}, Blocks to update: ${blocksToUpdate.length}`);

          // Create promises for all operations
          const createPromises = blocksToCreate.map(block => {
              console.log(`Creating block: ${block.title}`);
              return this.blockHttpService.createBlock(block);
          });
          const updatePromises = blocksToUpdate.map(block => {
              console.log(`Updating block ID: ${block.id}`);
              return this.blockHttpService.updateBlock(block.id!, block); // Use non-null assertion for ID
          });

          // Execute all promises
          const createdBlocks = await Promise.all(createPromises);
          const updatedBlocks = await Promise.all(updatePromises);

           // Combine results - careful about order if it matters
           // A safer approach might be to map results back based on temp ID or original index if needed
           // For now, assume concatenation works for updating the signal
           const finalBlocks = [...updatedBlocks, ...createdBlocks].filter(b => b); // Filter out potential nulls/errors

           // Update the local blocks signal with the results
           this.blocks.set(finalBlocks);

          console.log("Blocks successfully saved/updated. Final blocks:", this.blocks());
          // TODO: Add success message (e.g., using messageService)

        } else {
          console.error("Cannot save blocks, module version ID is missing or invalid after module save/update.");
           // TODO: Add user feedback
        }

      } catch (error) {
        console.error("Error during save process:", error);
         // TODO: Add user feedback (e.g., messageService.add for error)
      }
    }
    // --- Fin save ---

    // --- Game System Change Handler ---
    onGameSystemChange(event: SelectChangeEvent) {
        const selectedGameSystem = event.value;
        console.log("Game System Selection Changed:", selectedGameSystem);
        this.currentGameSystem.set(selectedGameSystem); // Update the signal directly
        // Update the gameSystemId in the currentModuleVersion signal
        this.currentModuleVersion.update(version => {
            // Use selected ID, fallback to existing ID, then fallback to null/undefined
            version.gameSystemId = selectedGameSystem?.id ?? version.gameSystemId ?? undefined;
            console.log("Module Version Game System ID updated to:", version.gameSystemId);
            return { ...version }; // Return new object reference for signal update
        });
    }
}