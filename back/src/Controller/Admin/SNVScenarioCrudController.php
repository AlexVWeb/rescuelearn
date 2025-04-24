<?php

namespace App\Controller\Admin;

use App\Entity\SNVScenario;
use App\Entity\SNVVictim;
use App\Form\SNVImportType;
use App\Form\SNVVictimType;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class SNVScenarioCrudController extends AbstractCrudController
{
    private $entityManager;
    private $adminUrlGenerator;

    public function __construct(EntityManagerInterface $entityManager, AdminUrlGenerator $adminUrlGenerator)
    {
        $this->entityManager = $entityManager;
        $this->adminUrlGenerator = $adminUrlGenerator;
    }

    public static function getEntityFqcn(): string
    {
        return SNVScenario::class;
    }

    public function configureActions(Actions $actions): Actions
    {
        $importScenario = Action::new('importScenario', 'Importer un scénario')
            ->setIcon('fa fa-file-import')
            ->linkToCrudAction('importScenario')
            ->addCssClass('btn btn-primary')
            ->createAsGlobalAction();

        return $actions
            ->add(Crud::PAGE_INDEX, $importScenario)
            ->update(Crud::PAGE_INDEX, Action::NEW, function (Action $action) {
                return $action->setIcon('fa fa-plus')->setLabel('Ajouter un scénario');
            })
            ->update(Crud::PAGE_INDEX, Action::DELETE, function (Action $action) {
                return $action->setIcon('fa fa-trash');
            })
            ->update(Crud::PAGE_INDEX, Action::EDIT, function (Action $action) {
                return $action->setIcon('fa fa-edit');
            })
            ->update(Crud::PAGE_INDEX, Action::BATCH_DELETE, function (Action $action) {
                return $action->setIcon('fa fa-trash-alt');
            })
            ->reorder(Crud::PAGE_INDEX, ['importScenario', Action::NEW, Action::EDIT, Action::DELETE]);
    }

    public function configureFields(string $pageName): iterable
    {
        yield FormField::addPanel('Informations générales');
        yield TextField::new('title', 'Titre');
        yield TextField::new('level', 'Niveau');
        yield TextareaField::new('description', 'Description');
        
        yield FormField::addPanel('Victimes');
        yield CollectionField::new('victimes', 'Victimes')
            ->setEntryType(SNVVictimType::class)
            ->allowAdd()
            ->allowDelete()
            ->setFormTypeOption('by_reference', false);
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setPageTitle('index', 'Scénarios SNV')
            ->setPageTitle('new', 'Créer un scénario SNV')
            ->setPageTitle('edit', 'Modifier le scénario SNV')
            ->setPageTitle('detail', 'Détails du scénario SNV')
            ->setDefaultSort(['title' => 'ASC']);
    }

    public function importScenario(Request $request): Response
    {
        $form = $this->createForm(SNVImportType::class);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();
            $json = json_decode($data['json'], true);

            if (json_last_error() === JSON_ERROR_NONE) {
                try {
                    $scenario = new SNVScenario();
                    $scenario->setTitle($json['title']);
                    $scenario->setLevel($json['level']);
                    $scenario->setDescription($json['description']);

                    foreach ($json['victimes'] as $victimData) {
                        $victim = new SNVVictim();
                        $victim->setDescription($victimData['description']);
                        $victim->setCorrectAnswer($victimData['correctAnswer']);
                        $victim->setExplanation($victimData['explanation']);
                        $victim->setScenario($scenario);
                        $this->entityManager->persist($victim);
                    }

                    $this->entityManager->persist($scenario);
                    $this->entityManager->flush();

                    $this->addFlash('success', 'Le scénario a été importé avec succès !');
                    
                    return $this->redirect($this->adminUrlGenerator
                        ->setController(self::class)
                        ->setAction(Action::INDEX)
                        ->generateUrl()
                    );
                } catch (\Exception $e) {
                    error_log('Erreur lors de l\'import : ' . $e->getMessage());
                    error_log('Trace : ' . $e->getTraceAsString());
                    $this->addFlash('danger', 'Une erreur est survenue lors de l\'import : ' . $e->getMessage());
                }
            } else {
                error_log('Erreur de décodage JSON : ' . json_last_error_msg());
                $this->addFlash('danger', 'Le JSON fourni n\'est pas valide.');
            }
        }

        return $this->render('admin/snv/import.html.twig', [
            'form' => $form->createView(),
            'page_title' => 'Importer un scénario SNV'
        ]);
    }
} 