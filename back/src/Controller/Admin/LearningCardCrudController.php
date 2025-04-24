<?php

namespace App\Controller\Admin;

use App\Entity\LearningCard;
use App\Form\LearningCardImportType;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class LearningCardCrudController extends AbstractCrudController
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
        return LearningCard::class;
    }

    public function configureActions(Actions $actions): Actions
    {
        $importCards = Action::new('importCards', 'Importer des cartes')
            ->setIcon('fa fa-file-import')
            ->linkToCrudAction('importCards')
            ->addCssClass('btn btn-primary')
            ->createAsGlobalAction();

        return $actions
            ->add(Crud::PAGE_INDEX, $importCards)
            ->update(Crud::PAGE_INDEX, Action::NEW, function (Action $action) {
                return $action->setIcon('fa fa-plus')->setLabel('Ajouter une carte');
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
            ->reorder(Crud::PAGE_INDEX, ['importCards', Action::NEW, Action::EDIT, Action::DELETE]);
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('theme', 'Thème');
        yield TextField::new('niveau', 'Niveau');
        yield TextareaField::new('info', 'Information');
        yield TextField::new('reference', 'Référence');
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setPageTitle('index', 'Cartes d\'apprentissage')
            ->setPageTitle('new', 'Créer une carte d\'apprentissage')
            ->setPageTitle('edit', 'Modifier la carte d\'apprentissage')
            ->setPageTitle('detail', 'Détails de la carte d\'apprentissage')
            ->setDefaultSort(['theme' => 'ASC']);
    }

    public function importCards(Request $request): Response
    {
        $form = $this->createForm(LearningCardImportType::class);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();
            $json = json_decode($data['json'], true);

            if (json_last_error() === JSON_ERROR_NONE) {
                try {
                    foreach ($json['cartes'] as $cardData) {
                        $card = new LearningCard();
                        $card->setTheme($json['theme']);
                        $card->setNiveau($cardData['niveau']);
                        $card->setInfo($cardData['info']);
                        $card->setReference($cardData['reference']);
                        $this->entityManager->persist($card);
                    }

                    $this->entityManager->flush();
                    $this->addFlash('success', 'Les cartes ont été importées avec succès !');
                    
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

        return $this->render('admin/learning_card/import.html.twig', [
            'form' => $form->createView(),
            'page_title' => 'Importer des cartes d\'apprentissage'
        ]);
    }
} 